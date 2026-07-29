import type { StoreAvailabilityRepository } from "../../domain/store-availability-repository.js";
import type { StoreAvailabilityEntry } from "../../domain/store-availability.js";
import { DEFAULT_USER_AGENT } from "../graphql/epa-graphql-client.js";

const TIMEOUT_MS = 10_000;

/**
 * Bloque `stockbystores` visto en el HTML de una página de producto
 * (verificado el 30/07/2026, ej. una puerta en combo): pares
 * `<div class="column store-name ...">CIUDAD</div>` +
 * `<div class="column stock-symbol ...">✔</div>`. Confirmado que viene
 * ya renderizado en el HTML servido (sin JS, sin llamada GraphQL/REST
 * aparte) - no es un endpoint, es un bloque de un módulo de Magento que
 * arma la página en el servidor.
 *
 * No documentado por EPA, no versionado, no es parte de ninguna API -
 * si cambian el theme esto deja de matchear y getByProductUrl empieza a
 * devolver `null` en silencio (ver el catch abajo), nunca revienta el
 * resto del CLI.
 */
const ENTRY_REGEX =
  /<div class="column store-name[^"]*">\s*([^<]+?)\s*<\/div>\s*<div class="column stock-symbol[^"]*">\s*([^<]*?)\s*<\/div>/g;

export class HtmlStoreAvailabilityRepository implements StoreAvailabilityRepository {
  constructor(private readonly userAgent: string = DEFAULT_USER_AGENT) {}

  async getByProductUrl(productUrl: string): Promise<StoreAvailabilityEntry[] | null> {
    let html: string;
    try {
      const response = await fetch(productUrl, {
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      html = await response.text();
    } catch {
      return null;
    }

    const entries: StoreAvailabilityEntry[] = [];
    for (const match of html.matchAll(ENTRY_REGEX)) {
      const city = match[1]?.trim();
      const symbol = match[2]?.trim() ?? "";
      if (city) {
        entries.push({ city, available: symbol.includes("✔") });
      }
    }

    return entries.length > 0 ? entries : null;
  }
}
