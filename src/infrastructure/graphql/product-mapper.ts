import { StockStatus, type Product } from "../../domain/product.js";
import type { RawProduct } from "./types.js";

const BASE_URL = "https://ve.epaenlinea.com";

/**
 * Función pura, sin dependencias externas -> fácil de testear sin
 * mockear fetch ni nada de red.
 */
export function mapRawProductToDomain(raw: RawProduct): Product {
  return {
    sku: raw.sku,
    name: raw.name,
    specialPrice: raw.special_price,
    stockStatus: raw.stock_status === "IN_STOCK" ? StockStatus.InStock : StockStatus.OutOfStock,
    onlyXLeftInStock: raw.only_x_left_in_stock,
    price: {
      regular: raw.price_range.minimum_price.regular_price,
      final: raw.price_range.minimum_price.final_price,
    },
    image: raw.small_image ? { url: raw.small_image.url } : null,
    urlKey: raw.url_key,
    productUrl: `${BASE_URL}/${raw.url_key}.html`,
  };
}
