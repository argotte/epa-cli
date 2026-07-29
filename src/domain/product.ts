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
}
