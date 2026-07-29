import { input, select, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import type { Product } from "../domain/product.js";
import type { ProductRepository, ProductSearchResult } from "../domain/product-repository.js";
import type { StoreAvailabilityRepository } from "../domain/store-availability-repository.js";
import { formatProductChoiceLabel, printProductDetail, printProducts, printSearchSummary } from "./format.js";
import { Spinner } from "./spinner.js";

type MenuAction = "search" | "sku" | "exit";
type NavAction = "detail" | "next" | "prev" | "back";
type DetailChoice = "back" | `related:${string}`;

/**
 * El CLI depende de ProductRepository (la interfaz), no de
 * EpaProductRepository. Puedes pasarle cualquier implementación -
 * incluida una falsa para tests o demos.
 */
export async function runMenu(
  repository: ProductRepository,
  storeAvailabilityRepository: StoreAvailabilityRepository,
  locale: string,
): Promise<void> {
  let running = true;

  while (running) {
    const action = await select<MenuAction>({
      message: "¿Qué quieres hacer?",
      choices: [
        { name: "Buscar productos", value: "search" },
        { name: "Buscar por SKU", value: "sku" },
        { name: "Salir", value: "exit" },
      ],
    });

    if (action === "exit") {
      running = false;
      continue;
    }

    if (action === "sku") {
      await handleSkuLookup(repository, storeAvailabilityRepository, locale);
    } else {
      await handleSearch(repository, storeAvailabilityRepository, locale);
    }
  }

  console.log(chalk.gray("Hasta luego."));
}

/**
 * Ficha completa de un producto, con navegación a los relacionados
 * (Enter sobre uno de ellos vuelve a mostrar su propia ficha). Se llama
 * tanto desde la búsqueda por texto como desde la búsqueda por SKU.
 */
async function showProductDetail(
  repository: ProductRepository,
  storeAvailabilityRepository: StoreAvailabilityRepository,
  urlKey: string,
  locale: string,
): Promise<void> {
  let currentUrlKey = urlKey;
  let viewing = true;

  while (viewing) {
    const spinner = new Spinner("Consultando EPA...");
    spinner.start();

    try {
      const detail = await repository.getDetail(currentUrlKey);

      if (!detail) {
        spinner.stop();
        console.log(chalk.yellow("No se pudo cargar el detalle de este producto."));
        return;
      }

      // Best-effort: si el scraping de disponibilidad falla (bloqueado,
      // timeout, cambió el theme), no debe tumbar el resto de la ficha.
      const availability = await storeAvailabilityRepository.getByProductUrl(detail.productUrl).catch(() => null);
      spinner.stop();

      printProductDetail(detail, locale, availability);

      const choices: { name: string; value: DetailChoice }[] = detail.relatedProducts.map((related) => ({
        name: `Ver ${related.sku} — ${related.name}`,
        value: `related:${related.urlKey}` as const,
      }));
      choices.push({ name: "Volver", value: "back" });

      const choice = await select<DetailChoice>({ message: "¿Qué quieres hacer?", choices });
      if (choice === "back") {
        viewing = false;
      } else {
        currentUrlKey = choice.slice("related:".length);
      }
    } catch (err) {
      spinner.stop();
      console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
      return;
    }
  }
}

async function pickProductUrlKey(products: Product[], locale: string): Promise<string | null> {
  const productChoices = products.map((product) => ({
    name: formatProductChoiceLabel(product, locale),
    value: product.urlKey,
  }));

  const urlKey = await select<string>({
    message: "¿Cuál producto?",
    choices: [...productChoices, new Separator(), { name: "Volver", value: "" }],
  });
  return urlKey === "" ? null : urlKey;
}

async function handleSkuLookup(
  repository: ProductRepository,
  storeAvailabilityRepository: StoreAvailabilityRepository,
  locale: string,
): Promise<void> {
  const sku = await input({
    message: "SKU:",
    validate: (value) => value.trim().length > 0 || "Escribe un SKU.",
  });

  const spinner = new Spinner("Consultando EPA...");
  spinner.start();
  let product: Product | null;
  try {
    product = await repository.getBySku(sku.trim());
  } catch (err) {
    spinner.stop();
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
    return;
  }
  spinner.stop();

  if (!product) {
    console.log(chalk.yellow(`No se encontró ningún producto con SKU "${sku.trim()}".`));
    return;
  }
  printProducts([product], locale);

  const choice = await select<"detail" | "back">({
    message: "¿Qué quieres hacer?",
    choices: [
      { name: "Ver detalle completo", value: "detail" },
      { name: "Volver al menú", value: "back" },
    ],
  });
  if (choice === "detail") {
    await showProductDetail(repository, storeAvailabilityRepository, product.urlKey, locale);
  }
}

async function handleSearch(
  repository: ProductRepository,
  storeAvailabilityRepository: StoreAvailabilityRepository,
  locale: string,
): Promise<void> {
  const term = await input({
    message: "Término de búsqueda:",
    validate: (value) => value.trim().length > 0 || "Escribe algo para buscar.",
  });

  let page = 1;
  let browsing = true;

  while (browsing) {
    const spinner = new Spinner("Consultando EPA...");
    spinner.start();

    let result: ProductSearchResult;
    try {
      result = await repository.search(term.trim(), { page });
    } catch (err) {
      spinner.stop();
      console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
      return;
    }
    spinner.stop();

    printSearchSummary(result);
    printProducts(result.items, locale);

    if (result.items.length === 0) {
      return;
    }

    // Sub-loop: mientras el usuario mire fichas de detalle, se queda en
    // esta misma página sin volver a consultar ni reimprimir la lista.
    let stayOnPage = true;
    while (stayOnPage) {
      const choices: { name: string; value: NavAction }[] = [{ name: "Ver detalle de un producto", value: "detail" }];
      if (page < result.totalPages) {
        choices.push({ name: "Siguiente página", value: "next" });
      }
      if (page > 1) {
        choices.push({ name: "Página anterior", value: "prev" });
      }
      choices.push({ name: "Volver al menú", value: "back" });

      const nav = await select<NavAction>({ message: "¿Qué quieres hacer?", choices });

      if (nav === "detail") {
        const urlKey = await pickProductUrlKey(result.items, locale);
        if (urlKey) {
          await showProductDetail(repository, storeAvailabilityRepository, urlKey, locale);
        }
        continue;
      }

      stayOnPage = false;
      if (nav === "next") {
        page += 1;
      } else if (nav === "prev") {
        page -= 1;
      } else {
        browsing = false;
      }
    }
  }
}
