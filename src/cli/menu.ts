import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import type { ProductRepository, ProductSearchResult } from "../domain/product-repository.js";
import { printProducts, printSearchSummary } from "./format.js";
import { Spinner } from "./spinner.js";

type MenuAction = "search" | "sku" | "exit";
type NavAction = "next" | "prev" | "back";

/**
 * El CLI depende de ProductRepository (la interfaz), no de
 * EpaProductRepository. Puedes pasarle cualquier implementación -
 * incluida una falsa para tests o demos.
 */
export async function runMenu(repository: ProductRepository, locale: string): Promise<void> {
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
      await handleSkuLookup(repository, locale);
    } else {
      await handleSearch(repository, locale);
    }
  }

  console.log(chalk.gray("Hasta luego."));
}

async function handleSkuLookup(repository: ProductRepository, locale: string): Promise<void> {
  const sku = await input({
    message: "SKU:",
    validate: (value) => value.trim().length > 0 || "Escribe un SKU.",
  });

  const spinner = new Spinner("Consultando EPA...");
  spinner.start();
  try {
    const product = await repository.getBySku(sku.trim());
    spinner.stop();
    if (!product) {
      console.log(chalk.yellow(`No se encontró ningún producto con SKU "${sku.trim()}".`));
      return;
    }
    printProducts([product], locale);
  } catch (err) {
    spinner.stop();
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
  }
}

async function handleSearch(repository: ProductRepository, locale: string): Promise<void> {
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

    const choices: { name: string; value: NavAction }[] = [];
    if (page < result.totalPages) {
      choices.push({ name: "Siguiente página", value: "next" });
    }
    if (page > 1) {
      choices.push({ name: "Página anterior", value: "prev" });
    }
    choices.push({ name: "Volver al menú", value: "back" });

    if (choices.length === 1) {
      return;
    }

    const nav = await select<NavAction>({ message: "¿Qué quieres hacer?", choices });
    if (nav === "next") {
      page += 1;
    } else if (nav === "prev") {
      page -= 1;
    } else {
      browsing = false;
    }
  }
}
