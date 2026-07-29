import chalk from "chalk";
import { StockStatus, type Product } from "../domain/product.js";

function formatStock(product: Product): string {
  if (product.stockStatus !== StockStatus.InStock) {
    return chalk.red("Agotado");
  }
  if (product.onlyXLeftInStock !== null) {
    return chalk.yellow(`Quedan ${product.onlyXLeftInStock}`);
  }
  return chalk.green("Disponible");
}

function formatPrice(product: Product): string {
  if (product.specialPrice !== null) {
    const regular = chalk.strikethrough(`$${product.price.regular.value}`);
    const special = chalk.bold.green(`$${product.specialPrice}`);
    return `${regular} ${special}`;
  }
  return chalk.bold(`$${product.price.final.value}`);
}

export function printProducts(products: Product[]): void {
  if (products.length === 0) {
    console.log(chalk.yellow("No se encontraron productos."));
    return;
  }

  console.log("");
  for (const product of products) {
    console.log(`${chalk.cyan(product.sku)}  ${product.name}`);
    console.log(`  ${formatPrice(product)}  |  ${formatStock(product)}`);
    console.log(`  ${chalk.gray(product.productUrl)}`);
    console.log("");
  }
}
