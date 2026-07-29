import type { StoreConfig } from "../../config.js";
import type { Product } from "../../domain/product.js";
import type {
  ProductRepository,
  ProductSearchFilter,
  ProductSearchOptions,
  ProductSearchResult,
  ProductSortOption,
} from "../../domain/product-repository.js";
import type { GraphQLClient } from "./epa-graphql-client.js";
import { mapRawProductToDomain } from "./product-mapper.js";
import { SEARCH_PRODUCTS_QUERY } from "./queries.js";
import type { ProductSearchResponse } from "./types.js";

interface RawProductFilterInput extends Record<string, unknown> {
  category_uid?: { eq: string };
  price?: { from?: string; to?: string };
}

interface RawProductSortInput extends Record<string, unknown> {
  name?: "ASC" | "DESC";
  position?: "ASC" | "DESC";
  relevance?: "ASC" | "DESC";
}

interface SearchProductsVariables extends Record<string, unknown> {
  search?: string;
  pageSize: number;
  currentPage: number;
  filter?: RawProductFilterInput;
  sort?: RawProductSortInput;
}

// Pageo grande de propósito: aumenta la chance de que el SKU exacto
// que buscamos esté entre los resultados de texto libre.
const SKU_LOOKUP_PAGE_SIZE = 20;

function buildRawFilter(filter: ProductSearchFilter | undefined): RawProductFilterInput | undefined {
  if (!filter) {
    return undefined;
  }

  const raw: RawProductFilterInput = {};
  if (filter.categoryUid) {
    raw.category_uid = { eq: filter.categoryUid };
  }
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    raw.price = {
      ...(filter.minPrice !== undefined ? { from: String(filter.minPrice) } : {}),
      ...(filter.maxPrice !== undefined ? { to: String(filter.maxPrice) } : {}),
    };
  }
  return Object.keys(raw).length > 0 ? raw : undefined;
}

/**
 * "price-asc"/"price-desc" no se traducen a `sort` del servidor -
 * EpaProductRepository.search los resuelve ordenando el array después.
 */
function buildRawSort(sort: ProductSortOption | undefined): RawProductSortInput | undefined {
  switch (sort) {
    case "name-asc":
      return { name: "ASC" };
    case "name-desc":
      return { name: "DESC" };
    case "position":
      return { position: "ASC" };
    case "relevance":
      return { relevance: "DESC" };
    default:
      return undefined;
  }
}

function applyClientSidePriceSort(items: Product[], sort: ProductSortOption | undefined): Product[] {
  if (sort === "price-asc") {
    return [...items].sort((a, b) => a.price.final.value - b.price.final.value);
  }
  if (sort === "price-desc") {
    return [...items].sort((a, b) => b.price.final.value - a.price.final.value);
  }
  return items;
}

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
    const { pageSize = 10, page = 1, filter, sort } = options;
    const trimmedTerm = term.trim();

    const variables: SearchProductsVariables = { pageSize, currentPage: page };
    if (trimmedTerm.length > 0) {
      variables.search = trimmedTerm;
    }
    const rawFilter = buildRawFilter(filter);
    if (rawFilter) {
      variables.filter = rawFilter;
    }
    const rawSort = buildRawSort(sort);
    if (rawSort) {
      variables.sort = rawSort;
    }

    const data = await this.client.request<ProductSearchResponse, SearchProductsVariables>(
      SEARCH_PRODUCTS_QUERY,
      variables,
    );

    const items = applyClientSidePriceSort(
      data.products.items.map((raw) => mapRawProductToDomain(raw, this.store)),
      sort,
    );

    return {
      items,
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
