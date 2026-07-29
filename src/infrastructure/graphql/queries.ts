/**
 * Campos confirmados contra ProductInterface vía introspección
 * (__type(name: "ProductInterface")) el 27/07/2026.
 */
export const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($search: String!, $pageSize: Int!, $currentPage: Int!) {
    products(search: $search, pageSize: $pageSize, currentPage: $currentPage) {
      total_count
      items {
        sku
        name
        special_price
        stock_status
        only_x_left_in_stock
        price_range {
          minimum_price {
            regular_price { value currency }
            final_price { value currency }
          }
        }
        small_image { url }
        url_key
      }
    }
  }
`;
