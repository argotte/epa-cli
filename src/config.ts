/**
 * Config de tienda derivada de `storeConfig` (ver
 * infrastructure/graphql/store-config.ts). Vive fuera de infrastructure/
 * porque tanto el mapper de GraphQL como el formatter del CLI la
 * necesitan, y ninguno de los dos debería depender del otro.
 */
export interface StoreConfig {
  baseUrl: string;
  currency: string;
  locale: string;
  productUrlSuffix: string;
}

/**
 * Valores confirmados contra el endpoint real (storeConfig, 29/07/2026).
 * Se usan si la query storeConfig falla al arrancar - no vale la pena
 * tumbar todo el CLI por eso.
 */
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  baseUrl: "https://ve.epaenlinea.com",
  currency: "USD",
  locale: "es-VE",
  productUrlSuffix: ".html",
};
