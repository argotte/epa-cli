import type { Product } from "./product.js";

export interface ProductSearchFilter {
  categoryUid?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * "price-asc"/"price-desc" no existen del lado del servidor (confirmado
 * por introspección: ProductAttributeSortInput solo admite name,
 * position, relevance) - el adaptador los resuelve ordenando la página
 * ya traída en el cliente.
 */
export type ProductSortOption = "relevance" | "name-asc" | "name-desc" | "position" | "price-asc" | "price-desc";

export interface ProductSearchOptions {
  pageSize?: number;
  page?: number;
  filter?: ProductSearchFilter;
  sort?: ProductSortOption;
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
  /** `term` vacío ("") = sin texto, útil para navegar solo por `filter`. */
  search(term: string, options?: ProductSearchOptions): Promise<ProductSearchResult>;
  /** Devuelve `null` si no hay match exacto de SKU. */
  getBySku(sku: string): Promise<Product | null>;
}
