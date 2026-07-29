/**
 * Estos tipos describen la forma CRUDA que devuelve /graphql.
 * Viven separados de src/domain/product.ts a propósito: si Magento
 * cambia un nombre de campo, este es el único archivo que debería
 * necesitar cambios (además del mapper).
 */

export interface RawMoney {
  value: number;
  currency: string;
}

export interface RawProductImage {
  url: string;
}

export type RawStockStatus = "IN_STOCK" | "OUT_OF_STOCK";

export interface RawCategory {
  name: string;
  url_path: string;
}

export interface RawProduct {
  sku: string;
  name: string;
  special_price: number | null;
  stock_status: RawStockStatus;
  only_x_left_in_stock: number | null;
  price_range: {
    minimum_price: {
      regular_price: RawMoney;
      final_price: RawMoney;
    };
  };
  small_image: RawProductImage | null;
  url_key: string;
  /** Viene ordenado raíz -> hoja (ej. "Productos", "Herramientas", "Taladros"). */
  categories: RawCategory[];
}

export interface RawPageInfo {
  current_page: number;
  total_pages: number;
}

export interface ProductSearchResponse {
  products: {
    total_count: number;
    page_info: RawPageInfo;
    items: RawProduct[];
  };
}

export interface RawStoreConfig {
  store_code: string;
  default_display_currency_code: string;
  locale: string;
  product_url_suffix: string;
}

export interface StoreConfigResponse {
  storeConfig: RawStoreConfig;
}

export interface RawCategoryNode {
  uid: string;
  name: string;
  url_key: string;
  product_count: number;
  // Magento lo devuelve como string a pesar del nombre.
  children_count: string;
}

export interface RawCategoryWithChildren extends RawCategoryNode {
  children: RawCategoryNode[];
}

export interface CategoryChildrenResponse {
  categories: {
    items: RawCategoryWithChildren[];
  };
}
