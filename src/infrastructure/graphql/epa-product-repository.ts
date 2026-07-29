import type { Product } from "../../domain/product.js";
import type { ProductRepository, ProductSearchOptions } from "../../domain/product-repository.js";
import type { GraphQLClient } from "./epa-graphql-client.js";
import { mapRawProductToDomain } from "./product-mapper.js";
import { SEARCH_PRODUCTS_QUERY } from "./queries.js";
import type { ProductSearchResponse } from "./types.js";

interface SearchProductsVariables extends Record<string, unknown> {
  search: string;
  pageSize: number;
  currentPage: number;
}

/**
 * Adaptador: implementa el puerto ProductRepository hablando GraphQL
 * con ve.epaenlinea.com. El resto de la app (el CLI) no sabe que esta
 * clase existe - solo conoce la interfaz ProductRepository.
 */
export class EpaProductRepository implements ProductRepository {
  constructor(private readonly client: GraphQLClient) {}

  async search(term: string, options: ProductSearchOptions = {}): Promise<Product[]> {
    const { pageSize = 10, page = 1 } = options;

    const data = await this.client.request<ProductSearchResponse, SearchProductsVariables>(
      SEARCH_PRODUCTS_QUERY,
      { search: term, pageSize, currentPage: page },
    );

    return data.products.items.map(mapRawProductToDomain);
  }
}
