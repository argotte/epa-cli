/**
 * Entidad de dominio. No sabe nada de GraphQL, HTTP, ni de Magento.
 * Si mañana cambiamos la fuente de datos (Algolia, REST, un scraper),
 * esta forma se mantiene igual.
 */

export enum StockStatus {
  InStock = "IN_STOCK",
  OutOfStock = "OUT_OF_STOCK",
}

export interface Money {
  value: number;
  currency: string;
}

export interface ProductPrice {
  regular: Money;
  final: Money;
}

export interface ProductImage {
  url: string;
}

export interface Product {
  sku: string;
  name: string;
  price: ProductPrice;
  /** Precio de oferta activo, si lo hay. null = sin oferta. */
  specialPrice: number | null;
  stockStatus: StockStatus;
  /** "Quedan 3 en stock", etc. null = no aplica / no informado. */
  onlyXLeftInStock: number | null;
  image: ProductImage | null;
  urlKey: string;
  /** URL absoluta a la página del producto, ya armada. */
  productUrl: string;
  /**
   * Categorías del catálogo, de la más general a la más específica
   * (ej. ["Herramientas", "Taladros", "Taladros eléctricos"]), sin la
   * raíz genérica del catálogo. No es la ubicación de una tienda física
   * -EPA no expone eso por API- pero es lo más parecido a "dónde vive
   * este producto" que hay disponible.
   */
  categoryPath: string[];
}

export interface RelatedProductRef {
  sku: string;
  name: string;
  urlKey: string;
}

/**
 * Ficha completa de un producto (lo que se ve en la página de detalle).
 * NO incluye tabla de "Características" ni disponibilidad por tienda
 * física - EPA no expone ninguna de las dos vía GraphQL (confirmado por
 * introspección de SimpleProduct/BundleProduct el 29/07/2026, mismos
 * campos que ProductInterface). Esa parte del sitio sale de otra fuente
 * (probablemente REST/AJAX) que este cliente no consume.
 */
export interface ProductDetail extends Product {
  /** Texto plano, ya sin las etiquetas HTML que trae Magento. */
  description: string;
  /** 0-100. 0 si no tiene reseñas. */
  ratingSummary: number;
  reviewCount: number;
  relatedProducts: RelatedProductRef[];
  /** Fecha hasta la que aplica el precio de oferta, si hay una. */
  specialToDate: string | null;
  /** Galería completa (más allá de la miniatura de `image`). */
  images: string[];
}
