import { DEFAULT_STORE_CONFIG, type StoreConfig } from "../../config.js";
import type { GraphQLClient } from "./epa-graphql-client.js";
import { STORE_CONFIG_QUERY } from "./queries.js";
import type { StoreConfigResponse } from "./types.js";

/**
 * Magento devuelve locales como "es_VE" (guion bajo); Intl.NumberFormat
 * espera BCP 47 ("es-VE"). Solo tenemos un locale confirmado por ahora.
 */
const LOCALE_MAP: Record<string, string> = {
  es_VE: "es-VE",
};

export async function fetchStoreConfig(client: GraphQLClient, baseUrl: string): Promise<StoreConfig> {
  const data = await client.request<StoreConfigResponse>(STORE_CONFIG_QUERY);
  const raw = data.storeConfig;

  return {
    baseUrl,
    currency: raw.default_display_currency_code,
    locale: LOCALE_MAP[raw.locale] ?? DEFAULT_STORE_CONFIG.locale,
    productUrlSuffix: raw.product_url_suffix,
  };
}
