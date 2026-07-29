import assert from "node:assert/strict";
import { test } from "node:test";
import { StockStatus } from "../../domain/product.js";
import { mapRawProductToDomain } from "./product-mapper.js";
import type { RawProduct } from "./types.js";

function buildRawProduct(overrides: Partial<RawProduct> = {}): RawProduct {
  return {
    sku: "VE-1472016",
    name: 'Taladro percutor inalámbrico 3/8" 12 V Black & Decker',
    special_price: null,
    stock_status: "IN_STOCK",
    only_x_left_in_stock: null,
    price_range: {
      minimum_price: {
        regular_price: { value: 150, currency: "USD" },
        final_price: { value: 150, currency: "USD" },
      },
    },
    small_image: { url: "https://ve.epaenlinea.com/media/catalog/product/x.jpg" },
    url_key: "taladro-percutor-inalambrico-3-8-12-v-black-decker",
    ...overrides,
  };
}

test("mapea un producto disponible sin oferta", () => {
  const product = mapRawProductToDomain(buildRawProduct());

  assert.equal(product.sku, "VE-1472016");
  assert.equal(product.stockStatus, StockStatus.InStock);
  assert.equal(product.specialPrice, null);
  assert.equal(product.price.final.value, 150);
  assert.equal(product.productUrl, "https://ve.epaenlinea.com/taladro-percutor-inalambrico-3-8-12-v-black-decker.html");
});

test("mapea stock_status agotado", () => {
  const product = mapRawProductToDomain(buildRawProduct({ stock_status: "OUT_OF_STOCK" }));
  assert.equal(product.stockStatus, StockStatus.OutOfStock);
});

test("conserva el precio de oferta cuando existe", () => {
  const product = mapRawProductToDomain(
    buildRawProduct({
      special_price: 119.99,
      price_range: {
        minimum_price: {
          regular_price: { value: 150, currency: "USD" },
          final_price: { value: 119.99, currency: "USD" },
        },
      },
    }),
  );

  assert.equal(product.specialPrice, 119.99);
  assert.equal(product.price.regular.value, 150);
  assert.equal(product.price.final.value, 119.99);
});

test("small_image null se mapea a image null, no revienta", () => {
  const product = mapRawProductToDomain(buildRawProduct({ small_image: null }));
  assert.equal(product.image, null);
});
