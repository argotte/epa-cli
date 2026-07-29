import chalk from "chalk";
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
