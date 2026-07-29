import type { StoreConfig } from "../../config.js";
import { StockStatus, type Product, type ProductDetail } from "../../domain/product.js";
import { stripHtml } from "./html-text.js";
import type { RawProduct, RawProductDetail } from "./types.js";

/**
 * Función pura, sin dependencias externas -> fácil de testear sin
 * mockear fetch ni nada de red.
 */
export function mapRawProductToDomain(raw: RawProduct, store: StoreConfig): Product {
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
    productUrl: `${store.baseUrl}/${raw.url_key}${store.productUrlSuffix}`,
    // El primer elemento es siempre la raíz genérica del catálogo
    // ("Productos" en toda la tienda) - no aporta nada, se descarta.
    categoryPath: raw.categories.slice(1).map((category) => category.name),
  };
}

export function mapRawProductDetailToDomain(raw: RawProductDetail, store: StoreConfig): ProductDetail {
  return {
    ...mapRawProductToDomain(raw, store),
    description: stripHtml(raw.description.html),
    ratingSummary: raw.rating_summary,
    reviewCount: raw.review_count,
    specialToDate: raw.special_to_date,
    images: raw.media_gallery.map((image) => image.url),
    relatedProducts: raw.related_products.map((related) => ({
      sku: related.sku,
      name: related.name,
      urlKey: related.url_key,
    })),
  };
}
