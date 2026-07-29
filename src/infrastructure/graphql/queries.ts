/**
 * Campos confirmados contra ProductInterface vía introspección
 * (__type(name: "ProductInterface")) el 27/07/2026.
 *
 * $search, $filter y $sort son opcionales a propósito: `products()`
 * acepta cualquier combinación (solo texto, solo filtro, ambos - hasta
 * ninguno) y devuelve resultados válidos en todos los casos, confirmado
 * contra el endpoint real. Esto permite reusar la misma query tanto
 * para "buscar taladro" como para "listar categoría X sin texto".
 */
export const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts(
    $search: String
    $pageSize: Int!
    $currentPage: Int!
    $filter: ProductAttributeFilterInput
    $sort: ProductAttributeSortInput
  ) {
    products(search: $search, filter: $filter, sort: $sort, pageSize: $pageSize, currentPage: $currentPage) {
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
 * Trae una categoría puntual (por url_key, o la raíz del catálogo -
 * category id "4", confirmado por consulta directa el 29/07/2026 - si
 * no se pasa url_key) junto con sus hijos directos.
 */
export const CATEGORY_CHILDREN_QUERY = `
  query CategoryChildren($filter: CategoryFilterInput!) {
    categories(filters: $filter) {
      items {
        uid
        name
        url_key
        product_count
        children_count
        children {
          uid
          name
          url_key
          product_count
          children_count
        }
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
