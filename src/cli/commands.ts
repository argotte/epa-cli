import { createRequire } from "node:module";
import chalk from "chalk";
import type { CategoryRepository } from "../domain/category-repository.js";
import type {
  ProductRepository,
  ProductSearchFilter,
  ProductSearchOptions,
  ProductSearchResult,
} from "../domain/product-repository.js";
import type { BuscarOptions, OutputFormat } from "./args.js";
import {
  printCategoryListing,
  printProducts,
  printProductsTable,
  printSearchSummary,
  serializeCategoryListing,
  serializeProducts,
} from "./format.js";
import { Spinner } from "./spinner.js";

const require = createRequire(import.meta.url);
const { version: CLI_VERSION } = require("../../package.json") as { version: string };

export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_EMPTY = 2;

// Categorías confirmadas por consulta directa el 29/07/2026:
// categories(filters:{ ids:{ in:["444","636"] } }).
const PROMOTIONS_CATEGORY_UID = "NDQ0";
const CLEARANCE_CATEGORY_UID = "NjM2";

async function resolveCategoryUid(categoryRepository: CategoryRepository, urlKey: string): Promise<string> {
  const listing = await categoryRepository.getChildren(urlKey);
  if (!listing) {
    throw new Error(`No existe la categoría "${urlKey}". Prueba "epa categorias" para ver las disponibles.`);
  }
  return listing.current.uid;
}

/**
 * Con exactOptionalPropertyTypes activo, asignar `undefined` a una clave
 * opcional es un error de tipos - por eso cada componente se agrega con
 * spread condicional en vez de `{ categoryUid: categoryUid ?? undefined }`.
 */
function buildFilter(
  categoryUid: string | undefined,
  min: number | undefined,
  max: number | undefined,
): ProductSearchFilter | undefined {
  const filter: ProductSearchFilter = {
    ...(categoryUid !== undefined ? { categoryUid } : {}),
    ...(min !== undefined ? { minPrice: min } : {}),
    ...(max !== undefined ? { maxPrice: max } : {}),
  };
  return Object.keys(filter).length > 0 ? filter : undefined;
}

function buildSearchOptions(
  page: number,
  pageSize: number,
  sort: BuscarOptions["orden"],
  filter: ProductSearchFilter | undefined,
): ProductSearchOptions {
  return {
    page,
    pageSize,
    ...(sort !== undefined ? { sort } : {}),
    ...(filter !== undefined ? { filter } : {}),
  };
}

function printSearchResult(result: ProductSearchResult, formato: OutputFormat, locale: string): number {
  if (formato === "json") {
    console.log(serializeProducts(result.items));
  } else {
    printSearchSummary(result);
    if (formato === "tabla") {
      printProductsTable(result.items, locale);
    } else {
      printProducts(result.items, locale);
    }
  }
  return result.items.length > 0 ? EXIT_OK : EXIT_EMPTY;
}

export async function runBuscarCommand(
  repository: ProductRepository,
  categoryRepository: CategoryRepository,
  term: string,
  options: BuscarOptions,
  locale: string,
): Promise<number> {
  const spinner = options.formato === "json" ? null : new Spinner("Consultando EPA...");
  spinner?.start();

  try {
    const categoryUid = options.categoria ? await resolveCategoryUid(categoryRepository, options.categoria) : undefined;
    const filter = buildFilter(categoryUid, options.min, options.max);

    const result = await repository.search(term, buildSearchOptions(options.page, options.size, options.orden, filter));
    spinner?.stop();

    return printSearchResult(result, options.formato, locale);
  } catch (err) {
    spinner?.stop();
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
    return EXIT_ERROR;
  }
}

export async function runSkuCommand(
  repository: ProductRepository,
  sku: string,
  formato: OutputFormat,
  locale: string,
): Promise<number> {
  const isJson = formato === "json";
  const spinner = isJson ? null : new Spinner("Consultando EPA...");
  spinner?.start();

  try {
    const product = await repository.getBySku(sku);
    spinner?.stop();

    if (!product) {
      if (isJson) {
        console.log("null");
      } else {
        console.log(chalk.yellow(`No se encontró ningún producto con SKU "${sku}".`));
      }
      return EXIT_EMPTY;
    }

    if (isJson) {
      console.log(serializeProducts([product]));
    } else if (formato === "tabla") {
      printProductsTable([product], locale);
    } else {
      printProducts([product], locale);
    }
    return EXIT_OK;
  } catch (err) {
    spinner?.stop();
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
    return EXIT_ERROR;
  }
}

export async function runCategoriasCommand(
  categoryRepository: CategoryRepository,
  urlKey: string | undefined,
  formato: OutputFormat,
): Promise<number> {
  const isJson = formato === "json";
  const spinner = isJson ? null : new Spinner("Consultando EPA...");
  spinner?.start();

  try {
    const listing = await categoryRepository.getChildren(urlKey);
    spinner?.stop();

    if (!listing) {
      if (isJson) {
        console.log("null");
      } else {
        console.log(chalk.yellow(`No existe la categoría "${urlKey}".`));
      }
      return EXIT_EMPTY;
    }

    if (isJson) {
      console.log(serializeCategoryListing(listing));
    } else {
      printCategoryListing(listing);
    }
    return EXIT_OK;
  } catch (err) {
    spinner?.stop();
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
    return EXIT_ERROR;
  }
}

export async function runPromosCommand(
  repository: ProductRepository,
  liquidacion: boolean,
  options: BuscarOptions,
  locale: string,
): Promise<number> {
  const spinner = options.formato === "json" ? null : new Spinner("Consultando EPA...");
  spinner?.start();

  try {
    const categoryUid = liquidacion ? CLEARANCE_CATEGORY_UID : PROMOTIONS_CATEGORY_UID;
    const filter = buildFilter(categoryUid, options.min, options.max);
    const result = await repository.search("", buildSearchOptions(options.page, options.size, options.orden, filter));
    spinner?.stop();

    return printSearchResult(result, options.formato, locale);
  } catch (err) {
    spinner?.stop();
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
    return EXIT_ERROR;
  }
}

export function printHelp(): void {
  console.log(`${chalk.bold("epa")} — CLI para el catálogo de Ferretería EPA Venezuela

${chalk.bold("Uso")}
  epa                                Menú interactivo
  epa buscar <término> [opciones]    Buscar productos
  epa sku <SKU> [opciones]           Buscar un producto por SKU exacto
  epa categorias [url-key]           Listar categorías (raíz si se omite)
  epa promos [--liquidacion]         Ver Promociones (o Liquidación)

${chalk.bold("Opciones de búsqueda")} (buscar, promos)
  --page <n>              Página a mostrar (default 1)
  --size <n>              Resultados por página (default 10)
  --min <precio>          Precio mínimo
  --max <precio>          Precio máximo
  --categoria <url-key>   Filtra por categoría (ver "epa categorias")
  --orden <valor>         relevancia | nombre-asc | nombre-desc | posicion |
                          precio-asc | precio-desc
                          (los dos de precio ordenan solo la página actual -
                          EPA no soporta orden por precio del lado del servidor)

${chalk.bold("Formato de salida")}
  --formato lista|tabla|json   default: lista
  --json                       atajo de --formato json
  --no-color                   desactiva colores

${chalk.bold("General")}
  -h, --help       Muestra esta ayuda
  -v, --version    Muestra la versión

Sin argumentos abre el menú interactivo con flechas.`);
}

export function printVersion(): void {
  console.log(CLI_VERSION);
}
