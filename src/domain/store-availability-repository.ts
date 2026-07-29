import type { StoreAvailabilityEntry } from "./store-availability.js";

/**
 * Puerto de dominio, separado de ProductRepository a propósito: esta
 * fuente NO es GraphQL, es scraping del HTML de la página de producto
 * (ver infrastructure/html/html-store-availability-repository.ts). El
 * CLI la llama de forma best-effort - si falla, el resto de la ficha de
 * producto sigue mostrándose igual.
 */
export interface StoreAvailabilityRepository {
  /** `null` = no se pudo determinar (bloqueado, timeout, markup cambió...). */
  getByProductUrl(productUrl: string): Promise<StoreAvailabilityEntry[] | null>;
}
