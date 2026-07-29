#!/usr/bin/env node
import { ExitPromptError } from "@inquirer/core";
import chalk from "chalk";
import { CliArgsError, parseCliArgs } from "./cli/args.js";
import {
  EXIT_ERROR,
  printHelp,
  printVersion,
  runBuscarCommand,
  runCategoriasCommand,
  runPromosCommand,
  runSkuCommand,
} from "./cli/commands.js";
import { runMenu } from "./cli/menu.js";
import { DEFAULT_STORE_CONFIG, type StoreConfig } from "./config.js";
import { EpaCategoryRepository } from "./infrastructure/graphql/epa-category-repository.js";
import { GraphQLClient } from "./infrastructure/graphql/epa-graphql-client.js";
import { EpaProductRepository } from "./infrastructure/graphql/epa-product-repository.js";
import { fetchStoreConfig } from "./infrastructure/graphql/store-config.js";
import { HtmlStoreAvailabilityRepository } from "./infrastructure/html/html-store-availability-repository.js";

/**
 * Composition root: el único lugar del proyecto donde se decide QUÉ
 * implementación concreta de ProductRepository/CategoryRepository se
 * usa. Para cambiar a Algolia mañana, escribes AlgoliaProductRepository
 * en infrastructure/ y cambias estas líneas - nada más en todo el repo
 * se toca.
 */
const EPA_GRAPHQL_ENDPOINT = "https://ve.epaenlinea.com/graphql";

// Si el CLI corre en un pipe que se cierra antes de tiempo (`epa buscar
// taladro --json | head`, o el comando del otro lado no existe), Node
// tira un EPIPE sin capturar y revienta con un stack trace. Salir en
// silencio es el comportamiento esperado de cualquier herramienta Unix.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") {
    process.exit(0);
  }
  throw err;
});

async function main(): Promise<void> {
  // El parseo de argumentos no toca la red - si el usuario escribió mal
  // una flag, se entera antes de esperar por EPA.
  const { command, noColor } = parseCliArgs(process.argv.slice(2));
  if (noColor) {
    chalk.level = 0;
  }

  if (command.kind === "help") {
    printHelp();
    return;
  }
  if (command.kind === "version") {
    printVersion();
    return;
  }

  const client = new GraphQLClient(EPA_GRAPHQL_ENDPOINT);

  let store: StoreConfig;
  try {
    store = await fetchStoreConfig(client, DEFAULT_STORE_CONFIG.baseUrl);
  } catch (err) {
    console.error(
      chalk.gray(
        `No se pudo leer la configuración de la tienda, usando valores por defecto: ${(err as Error).message}`,
      ),
    );
    store = DEFAULT_STORE_CONFIG;
  }

  const repository = new EpaProductRepository(client, store);
  const categoryRepository = new EpaCategoryRepository(client);
  const storeAvailabilityRepository = new HtmlStoreAvailabilityRepository();

  switch (command.kind) {
    case "menu":
      await runMenu(repository, storeAvailabilityRepository, store.locale);
      return;
    case "buscar":
      process.exitCode = await runBuscarCommand(repository, categoryRepository, command.term, command.options, store.locale);
      return;
    case "sku":
      process.exitCode = await runSkuCommand(repository, command.sku, command.formato, store.locale);
      return;
    case "categorias":
      process.exitCode = await runCategoriasCommand(categoryRepository, command.urlKey, command.formato);
      return;
    case "promos":
      process.exitCode = await runPromosCommand(repository, command.liquidacion, command.options, store.locale);
      return;
  }
}

main().catch((err: unknown) => {
  if (err instanceof ExitPromptError) {
    // Ctrl+C durante un prompt - salida normal, no un error real.
    console.log("\nHasta luego.");
    process.exitCode = 0;
    return;
  }
  if (err instanceof CliArgsError) {
    console.error(chalk.red(err.message));
    console.error(chalk.gray("Usa --help para ver los comandos disponibles."));
    process.exitCode = EXIT_ERROR;
    return;
  }
  console.error("Error fatal:", err);
  process.exitCode = EXIT_ERROR;
});
