import { parseArgs } from "node:util";
import type { ProductSortOption } from "../domain/product-repository.js";

export type OutputFormat = "lista" | "tabla" | "json";

export interface BuscarOptions {
  page: number;
  size: number;
  // Uniones con `undefined` en vez de campos opcionales (`?`) a propósito:
  // con exactOptionalPropertyTypes activo, un objeto siempre construido
  // con TODAS las claves presentes (algunas en `undefined`) es más simple
  // que ir armándolo condicionalmente en cada punto de construcción.
  min: number | undefined;
  max: number | undefined;
  categoria: string | undefined;
  orden: ProductSortOption | undefined;
  formato: OutputFormat;
}

export type ParsedCommand =
  | { kind: "menu" }
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "buscar"; term: string; options: BuscarOptions }
  | { kind: "sku"; sku: string; formato: OutputFormat }
  | { kind: "categorias"; urlKey: string | undefined; formato: OutputFormat }
  | { kind: "promos"; liquidacion: boolean; options: BuscarOptions };

export interface CliInvocation {
  command: ParsedCommand;
  noColor: boolean;
}

export class CliArgsError extends Error {}

/**
 * En español para que combine con el resto de la UI, ya que sería raro
 * mezclar "--orden price-asc" con mensajes en español.
 */
const SORT_VALUES: Record<string, ProductSortOption> = {
  relevancia: "relevance",
  "nombre-asc": "name-asc",
  "nombre-desc": "name-desc",
  posicion: "position",
  "precio-asc": "price-asc",
  "precio-desc": "price-desc",
};

function parseNumberOption(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new CliArgsError(`--${name} debe ser un número (recibí "${raw}").`);
  }
  return value;
}

function parseSort(raw: string | undefined): ProductSortOption | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const sort = SORT_VALUES[raw];
  if (!sort) {
    throw new CliArgsError(`--orden inválido "${raw}". Usa: ${Object.keys(SORT_VALUES).join(", ")}.`);
  }
  return sort;
}

function parseFormato(json: boolean, raw: string | undefined): OutputFormat {
  if (json) {
    return "json";
  }
  if (raw === undefined) {
    return "lista";
  }
  if (raw === "lista" || raw === "tabla" || raw === "json") {
    return raw;
  }
  throw new CliArgsError(`--formato inválido "${raw}". Usa: lista, tabla, json.`);
}

export function parseCliArgs(argv: string[]): CliInvocation {
  let values: ReturnType<typeof parseArgs>["values"];
  let positionals: string[];

  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        page: { type: "string" },
        size: { type: "string" },
        min: { type: "string" },
        max: { type: "string" },
        categoria: { type: "string" },
        orden: { type: "string" },
        formato: { type: "string" },
        json: { type: "boolean" },
        "no-color": { type: "boolean" },
        liquidacion: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    }));
  } catch (err) {
    throw new CliArgsError((err as Error).message);
  }

  const noColor = Boolean(values["no-color"]);

  if (values.help) {
    return { command: { kind: "help" }, noColor };
  }
  if (values.version) {
    return { command: { kind: "version" }, noColor };
  }

  const [command, ...rest] = positionals;

  if (!command) {
    return { command: { kind: "menu" }, noColor };
  }

  const formato = parseFormato(Boolean(values.json), values.formato as string | undefined);
  const buscarOptions: BuscarOptions = {
    page: parseNumberOption("page", values.page as string | undefined) ?? 1,
    size: parseNumberOption("size", values.size as string | undefined) ?? 10,
    min: parseNumberOption("min", values.min as string | undefined),
    max: parseNumberOption("max", values.max as string | undefined),
    categoria: values.categoria as string | undefined,
    orden: parseSort(values.orden as string | undefined),
    formato,
  };

  switch (command) {
    case "buscar": {
      const term = rest.join(" ").trim();
      if (term.length === 0 && !buscarOptions.categoria) {
        throw new CliArgsError('"epa buscar" necesita un término (o --categoria). Ej: epa buscar taladro');
      }
      return { command: { kind: "buscar", term, options: buscarOptions }, noColor };
    }
    case "sku": {
      const sku = rest[0];
      if (!sku) {
        throw new CliArgsError('"epa sku" necesita un SKU. Ej: epa sku VE-1001010');
      }
      return { command: { kind: "sku", sku, formato }, noColor };
    }
    case "categorias":
      return { command: { kind: "categorias", urlKey: rest[0], formato }, noColor };
    case "promos":
      return { command: { kind: "promos", liquidacion: Boolean(values.liquidacion), options: buscarOptions }, noColor };
    default:
      throw new CliArgsError(`Comando desconocido "${command}".`);
  }
}
