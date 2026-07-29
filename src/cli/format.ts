import chalk from "chalk";
import type { CategoryListing } from "../domain/category.js";
import { StockStatus, type Money, type Product } from "../domain/product.js";
import type { ProductSearchResult } from "../domain/product-repository.js";

/**
 * Texto ya coloreado (`text`) junto con su ancho VISIBLE (`width`), es
 * decir sin contar los códigos ANSI de chalk. Evitamos tener que hacer
 * strip de ANSI para alinear: cada builder sabe su propio ancho porque
 * lo arma a partir de las partes planas.
 */
interface Line {
  text: string;
  width: number;
}

const BOX_MIN_CONTENT_WIDTH = 42;
const BOX_MAX_CONTENT_WIDTH = 92;
// Bordes (2) + un espacio de padding a cada lado (2).
const BOX_CHROME_WIDTH = 4;

function getContentWidth(): number {
  const columns = process.stdout.columns ?? 80;
  const boxWidth = Math.min(Math.max(columns, BOX_MIN_CONTENT_WIDTH + BOX_CHROME_WIDTH), BOX_MAX_CONTENT_WIDTH);
  return boxWidth - BOX_CHROME_WIDTH;
}

function truncate(text: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return "";
  }
  if (text.length <= maxWidth) {
    return text;
  }
  if (maxWidth === 1) {
    return "…";
  }
  return `${text.slice(0, maxWidth - 1)}…`;
}

function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: money.currency }).format(money.value);
}

function buildHeaderLine(sku: string, name: string, width: number): Line {
  const plain = `${sku}  ${name}`;
  const truncated = truncate(plain, width);
  const skuLength = Math.min(sku.length, truncated.length);
  const rest = truncated.slice(skuLength);
  return { text: `${chalk.cyan.bold(truncated.slice(0, skuLength))}${rest}`, width: truncated.length };
}

function buildCategoryLine(categoryPath: string[], width: number): Line | null {
  if (categoryPath.length === 0) {
    return null;
  }
  const truncated = truncate(categoryPath.join(" › "), width);
  return { text: chalk.gray(truncated), width: truncated.length };
}

function buildPriceLine(product: Product, locale: string): Line {
  if (product.specialPrice !== null) {
    const regularPlain = formatMoney(product.price.regular, locale);
    const specialPlain = formatMoney({ value: product.specialPrice, currency: product.price.final.currency }, locale);
    const text = `${chalk.strikethrough.gray(regularPlain)} ${chalk.bold.green(specialPlain)}`;
    return { text, width: regularPlain.length + 1 + specialPlain.length };
  }
  const finalPlain = formatMoney(product.price.final, locale);
  return { text: chalk.bold(finalPlain), width: finalPlain.length };
}

function buildStockLine(product: Product): Line {
  if (product.stockStatus !== StockStatus.InStock) {
    const plain = "Agotado";
    return { text: chalk.red(plain), width: plain.length };
  }
  if (product.onlyXLeftInStock !== null) {
    const plain = `Quedan ${product.onlyXLeftInStock}`;
    return { text: chalk.yellow(plain), width: plain.length };
  }
  const plain = "Disponible";
  return { text: chalk.green(plain), width: plain.length };
}

/** Precio a la izquierda, disponibilidad empujada al borde derecho. */
function buildPriceStockLine(product: Product, locale: string, width: number): Line {
  const price = buildPriceLine(product, locale);
  const stock = buildStockLine(product);
  const gap = Math.max(width - price.width - stock.width, 1);
  return { text: `${price.text}${" ".repeat(gap)}${stock.text}`, width: price.width + gap + stock.width };
}

function buildUrlLine(url: string, width: number): Line {
  const truncated = truncate(url, width);
  return { text: chalk.gray(truncated), width: truncated.length };
}

function printBoxTop(width: number): void {
  console.log(chalk.gray(`╭${"─".repeat(width + 2)}╮`));
}

function printBoxBottom(width: number): void {
  console.log(chalk.gray(`╰${"─".repeat(width + 2)}╯`));
}

function printBoxLine(line: Line, width: number): void {
  const pad = Math.max(width - line.width, 0);
  const border = chalk.gray("│");
  console.log(`${border} ${line.text}${" ".repeat(pad)} ${border}`);
}

export function printProducts(products: Product[], locale: string): void {
  if (products.length === 0) {
    console.log(chalk.yellow("No se encontraron productos."));
    return;
  }

  const width = getContentWidth();

  console.log("");
  for (const product of products) {
    printBoxTop(width);
    printBoxLine(buildHeaderLine(product.sku, product.name, width), width);

    const categoryLine = buildCategoryLine(product.categoryPath, width);
    if (categoryLine) {
      printBoxLine(categoryLine, width);
    }

    printBoxLine(buildPriceStockLine(product, locale, width), width);
    printBoxLine(buildUrlLine(product.productUrl, width), width);
    printBoxBottom(width);
    console.log("");
  }
}

export function printSearchSummary(result: ProductSearchResult): void {
  const count = `${result.totalCount} resultado${result.totalCount === 1 ? "" : "s"}`;
  const pages = result.totalPages > 0 ? ` — página ${result.currentPage} de ${result.totalPages}` : "";
  console.log(chalk.bold.gray(`${count}${pages}`));
}

// ---------------------------------------------------------------------------
// Formato tabla (--formato tabla): compacto, una fila por producto. A
// diferencia de la tarjeta, si hay oferta solo muestra el precio final
// (no hay espacio para el tachado + el precio de oferta en una columna).
// ---------------------------------------------------------------------------

const TABLE_SKU_WIDTH = 14;
const TABLE_PRICE_WIDTH = 12;
const TABLE_STOCK_WIDTH = 11;
const TABLE_MIN_TOTAL_WIDTH = 70;
const TABLE_MAX_TOTAL_WIDTH = 140;
const TABLE_MIN_NAME_WIDTH = 10;

function padLineEnd(line: Line, width: number): string {
  return `${line.text}${" ".repeat(Math.max(width - line.width, 0))}`;
}

function padLineStart(line: Line, width: number): string {
  return `${" ".repeat(Math.max(width - line.width, 0))}${line.text}`;
}

function buildTablePriceLine(product: Product, locale: string): Line {
  const isOffer = product.specialPrice !== null;
  const value = isOffer ? (product.specialPrice as number) : product.price.final.value;
  const plain = formatMoney({ value, currency: product.price.final.currency }, locale);
  return { text: isOffer ? chalk.bold.green(plain) : chalk.bold(plain), width: plain.length };
}

export function printProductsTable(products: Product[], locale: string): void {
  if (products.length === 0) {
    console.log(chalk.yellow("No se encontraron productos."));
    return;
  }

  const totalWidth = Math.min(Math.max(process.stdout.columns ?? 100, TABLE_MIN_TOTAL_WIDTH), TABLE_MAX_TOTAL_WIDTH);
  const nameWidth = Math.max(
    totalWidth - TABLE_SKU_WIDTH - TABLE_PRICE_WIDTH - TABLE_STOCK_WIDTH - 3,
    TABLE_MIN_NAME_WIDTH,
  );

  const header = `${"SKU".padEnd(TABLE_SKU_WIDTH)} ${"Nombre".padEnd(nameWidth)} ${"Precio".padStart(TABLE_PRICE_WIDTH)} ${"Estado".padEnd(TABLE_STOCK_WIDTH)}`;
  console.log(chalk.bold(header));
  console.log(chalk.gray("─".repeat(header.length)));

  for (const product of products) {
    const skuCell = chalk.cyan.bold(truncate(product.sku, TABLE_SKU_WIDTH).padEnd(TABLE_SKU_WIDTH));
    const nameCell = truncate(product.name, nameWidth).padEnd(nameWidth);
    const priceCell = padLineStart(buildTablePriceLine(product, locale), TABLE_PRICE_WIDTH);
    const stockCell = padLineEnd(buildStockLine(product), TABLE_STOCK_WIDTH);
    console.log(`${skuCell} ${nameCell} ${priceCell} ${stockCell}`);
  }
}

// ---------------------------------------------------------------------------
// Formato JSON (--json / --formato json): sin colores, sin adornos, para
// usar en scripts (`epa buscar taladro --json | jq '.[].sku'`).
// ---------------------------------------------------------------------------

export function serializeProducts(products: Product[]): string {
  return JSON.stringify(
    products.map((product) => ({
      sku: product.sku,
      name: product.name,
      price: product.price,
      specialPrice: product.specialPrice,
      stockStatus: product.stockStatus,
      onlyXLeftInStock: product.onlyXLeftInStock,
      categoryPath: product.categoryPath,
      url: product.productUrl,
    })),
    null,
    2,
  );
}

export function serializeCategoryListing(listing: CategoryListing): string {
  return JSON.stringify(
    {
      current: {
        name: listing.current.name,
        urlKey: listing.current.urlKey,
        productCount: listing.current.productCount,
      },
      children: listing.children.map((child) => ({
        name: child.name,
        urlKey: child.urlKey,
        productCount: child.productCount,
        childrenCount: child.childrenCount,
      })),
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Listado de categorías (`epa categorias [url-key]`).
// ---------------------------------------------------------------------------

export function printCategoryListing(listing: CategoryListing): void {
  const header = `${listing.current.name}`;
  const meta = ` (${listing.current.productCount} productos, ${listing.children.length} subcategorías)`;
  console.log(`${chalk.bold(header)}${chalk.gray(meta)}`);

  if (listing.children.length === 0) {
    console.log(chalk.gray("  (sin subcategorías)"));
    return;
  }

  console.log("");
  const nameWidth = Math.max(...listing.children.map((child) => child.name.length)) + 2;
  for (const child of listing.children) {
    const count = `${child.productCount} producto${child.productCount === 1 ? "" : "s"}`;
    console.log(`  ${chalk.cyan(child.name.padEnd(nameWidth))}${chalk.gray(count)}`);
  }
  console.log("");
  console.log(chalk.gray('Usa "epa categorias <url-key>" o --categoria <url-key> para entrar a una de estas.'));
}
