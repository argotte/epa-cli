import type { StoreConfig } from "../../config.js";
import type { Product } from "../../domain/product.js";
import type {
  ProductRepository,
  ProductSearchOptions,
  ProductSearchResult,
} from "../../domain/product-repository.js";
import type { GraphQLClient } from "./epa-graphql-client.js";
import { mapRawProductToDomain } from "./product-mapper.js";
import { SEARCH_PRODUCTS_QUERY } from "./queries.js";
import type { ProductSearchResponse } from "./types.js";

interface SearchProductsVariables extends Record<string, unknown> {
  search: string;
  pageSize: number;
  currentPage: number;
}

// Pageo grande de propósito: aumenta la chance de que el SKU exacto
// que buscamos esté entre los resultados de texto libre.
const SKU_LOOKUP_PAGE_SIZE = 20;

/**
 * Adaptador: implementa el puerto ProductRepository hablando GraphQL
 * con ve.epaenlinea.com. El resto de la app (el CLI) no sabe que esta
 * clase existe - solo conoce la interfaz ProductRepository.
 */
export class EpaProductRepository implements ProductRepository {
  constructor(
    private readonly client: GraphQLClient,
    private readonly store: StoreConfig,
  ) {}

  async search(term: string, options: ProductSearchOptions = {}): Promise<ProductSearchResult> {
    const { pageSize = 10, page = 1 } = options;

    const data = await this.client.request<ProductSearchResponse, SearchProductsVariables>(
      SEARCH_PRODUCTS_QUERY,
      { search: term, pageSize, currentPage: page },
    );

    return {
      items: data.products.items.map((raw) => mapRawProductToDomain(raw, this.store)),
      totalCount: data.products.total_count,
      currentPage: data.products.page_info.current_page,
      totalPages: data.products.page_info.total_pages,
    };
  }

  /**
   * EPA no expone un filtro por SKU en `ProductAttributeFilterInput`
   * (confirmado por introspección el 29/07/2026 - solo acepta
   * category_id, category_uid, created_at, news_from_date, news_to_date,
   * price, url_key). El SKU sirve como término de búsqueda de texto
   * libre, así que buscamos por él y quedamos con el match exacto.
   */
  async getBySku(sku: string): Promise<Product | null> {
    const result = await this.search(sku, { pageSize: SKU_LOOKUP_PAGE_SIZE });
    const normalized = sku.trim().toLowerCase();
    return result.items.find((item) => item.sku.toLowerCase() === normalized) ?? null;
  }
}
