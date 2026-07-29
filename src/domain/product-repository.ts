import type { Product } from "./product.js";

export interface ProductSearchOptions {
  pageSize?: number;
  page?: number;
}

export interface ProductSearchResult {
  items: Product[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Puerto de dominio (patrón Repository / Ports & Adapters).
 *
 * El CLI depende de ESTA interfaz, no de "EpaProductRepository" ni de
 * GraphQL. Eso significa que:
 *  - puedes escribir otra implementación (REST, Algolia, un fake para
 *    tests) sin tocar el CLI.
 *  - si en el futuro sacas esto a un módulo NestJS, este archivo se
 *    reutiliza tal cual como el "token" de inyección.
 */
export interface ProductRepository {
  search(term: string, options?: ProductSearchOptions): Promise<ProductSearchResult>;
  /** Devuelve `null` si no hay match exacto de SKU. */
  getBySku(sku: string): Promise<Product | null>;
}
