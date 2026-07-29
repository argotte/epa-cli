/**
 * Campos confirmados contra ProductInterface vía introspección
 * (__type(name: "ProductInterface")) el 27/07/2026.
 */
export const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($search: String!, $pageSize: Int!, $currentPage: Int!) {
    products(search: $search, pageSize: $pageSize, currentPage: $currentPage) {
      total_count
      page_info {
        current_page
        total_pages
      }
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
        categories { name url_path }
      }
    }
  }
`;

/**
 * Campos confirmados contra storeConfig vía introspección/consulta
 * directa el 29/07/2026: store_code "t6", currency "USD", locale
 * "es_VE", product_url_suffix ".html".
 */
export const STORE_CONFIG_QUERY = `
  query StoreConfig {
    storeConfig {
      store_code
      default_display_currency_code
      locale
      product_url_suffix
    }
  }
`;
