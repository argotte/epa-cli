import { ExitPromptError } from "@inquirer/core";
import { runMenu } from "./cli/menu.js";
import { GraphQLClient } from "./infrastructure/graphql/epa-graphql-client.js";
import { EpaProductRepository } from "./infrastructure/graphql/epa-product-repository.js";

/**
 * Composition root: el único lugar del proyecto donde se decide QUÉ
 * implementación concreta de ProductRepository se usa. Para cambiar a
 * Algolia mañana, escribes AlgoliaProductRepository en infrastructure/
 * y cambias estas dos líneas - nada más en todo el repo se toca.
 */
const EPA_GRAPHQL_ENDPOINT = "https://ve.epaenlinea.com/graphql";

async function main(): Promise<void> {
  const client = new GraphQLClient(EPA_GRAPHQL_ENDPOINT);
  const repository = new EpaProductRepository(client);

  await runMenu(repository);
}

main().catch((err: unknown) => {
  if (err instanceof ExitPromptError) {
    // Ctrl+C durante un prompt - salida normal, no un error real.
    console.log("\nHasta luego.");
    process.exitCode = 0;
    return;
  }
  console.error("Error fatal:", err);
  process.exitCode = 1;
});
