import type { CategoryListing, CategorySummary } from "../../domain/category.js";
import type { CategoryRepository } from "../../domain/category-repository.js";
import type { GraphQLClient } from "./epa-graphql-client.js";
import { CATEGORY_CHILDREN_QUERY } from "./queries.js";
import type { CategoryChildrenResponse, RawCategoryNode } from "./types.js";

// Categoría raíz del catálogo completo ("Productos"), confirmada por
// consulta directa el 29/07/2026: categories(filters:{ids:{eq:"4"}}).
const ROOT_CATEGORY_ID = "4";

interface CategoryFilterVariables extends Record<string, unknown> {
  filter: { ids: { eq: string } } | { url_key: { eq: string } };
}

function mapCategory(raw: RawCategoryNode): CategorySummary {
  return {
    uid: raw.uid,
    name: raw.name,
    urlKey: raw.url_key,
    productCount: raw.product_count,
    childrenCount: Number(raw.children_count),
  };
}

export class EpaCategoryRepository implements CategoryRepository {
  constructor(private readonly client: GraphQLClient) {}

  async getChildren(urlKey?: string): Promise<CategoryListing | null> {
    const filter = urlKey ? { url_key: { eq: urlKey } } : { ids: { eq: ROOT_CATEGORY_ID } };

    const data = await this.client.request<CategoryChildrenResponse, CategoryFilterVariables>(
      CATEGORY_CHILDREN_QUERY,
      { filter },
    );

    const item = data.categories.items[0];
    if (!item) {
      return null;
    }

    return {
      current: mapCategory(item),
      children: item.children.map(mapCategory),
    };
  }
}
