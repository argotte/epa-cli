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
}

export interface ProductSearchResponse {
  products: {
    total_count: number;
    items: RawProduct[];
  };
}
