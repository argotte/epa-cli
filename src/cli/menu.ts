import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import type { ProductRepository } from "../domain/product-repository.js";
import { printProducts } from "./format.js";

type MenuAction = "search" | "exit";

/**
 * El CLI depende de ProductRepository (la interfaz), no de
 * EpaProductRepository. Puedes pasarle cualquier implementación -
 * incluida una falsa para tests o demos.
 */
export async function runMenu(repository: ProductRepository): Promise<void> {
  let running = true;

  while (running) {
    const action = await select<MenuAction>({
      message: "¿Qué quieres hacer?",
      choices: [
        { name: "Buscar productos", value: "search" },
        { name: "Salir", value: "exit" },
      ],
    });

    if (action === "exit") {
      running = false;
      continue;
    }

    await handleSearch(repository);
  }

  console.log(chalk.gray("Hasta luego."));
}

async function handleSearch(repository: ProductRepository): Promise<void> {
  const term = await input({
    message: "Término de búsqueda:",
    validate: (value) => value.trim().length > 0 || "Escribe algo para buscar.",
  });

  try {
    const products = await repository.search(term.trim());
    printProducts(products);
  } catch (err) {
    console.error(chalk.red(`Error consultando EPA: ${(err as Error).message}`));
  }
}
