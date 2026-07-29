# EPA Venezuela — Notas del proyecto (API + CLI)

Resumen de todo lo confirmado durante la investigación de
`ve.epaenlinea.com`, para no tener que repetir el proceso desde cero
en el futuro.

## 1. Objetivo original

Determinar si el API/endpoints que consume el frontend de Ferretería
EPA Venezuela son utilizables para construir una solución propia
(app, CLI, tracker de precios).

## 2. Plataforma del sitio

- **Magento 2**, confirmado por:
  - Rutas nativas: `/customer/account/`, `/checkout/cart/`
  - Extensión de terceros detectada: Magestore Banner Slider
    (`/media/magestore/bannerslider/...`)
  - Versionado de assets estáticos típico de Magento 2:
    `/static/version.../frontend/EPA/EpaThemeVE/es_VE/...`
  - Sufijo `.html` en URLs de producto/categoría (config por defecto
    de Magento)
- Instalación **multi-país** compartida bajo `epaenlinea.com`
  (Costa Rica, Guatemala, El Salvador, Venezuela)
- **No existe app móvil dedicada** — el canal online es la web, más
  WhatsApp/teléfono para pedidos

## 3. Infraestructura y protección

- El sitio está detrás de **CloudFront** (AWS), con lo que parece un
  **WAF** delante del origen
- `store_code` confirmado (vía query `storeConfig`): **`t6`**
- **Hallazgo clave:** un `curl` con el User-Agent por defecto (sin
  headers de navegador) contra `/graphql` o `/rest/V1/*` devuelve un
  **403** servido por CloudFront/S3 con una página estática de
  "sitio en mantenimiento" (con `Last-Modified` de 2019 — es una
  página de error cacheada, **no** significa que el sitio esté
  realmente caído; confirmado porque el resto del sitio funciona
  normal en simultáneo)
- La misma request desde **Postman**, agregando un header
  `User-Agent` de navegador real, responde **200 OK** de inmediato,
  desde la misma máquina/IP
- **Conclusión:** el bloqueo es por **firma del cliente**
  (User-Agent / fingerprint), no por IP ni por rate limiting
- Nota práctica de Windows: `cmd.exe` **no soporta** `\` como
  continuación de línea (es sintaxis de bash) — comandos largos hay
  que escribirlos en una sola línea, o usar PowerShell/`^`

## 4. Endpoint GraphQL

- URL: `POST https://ve.epaenlinea.com/graphql`
- Header necesario en la práctica: `User-Agent` de navegador real
- **Introspección habilitada** (no la desactivaron) — se puede seguir
  explorando el esquema directamente contra el servidor

Query de introspección usada:

```json
{
  "query": "{ __type(name: \"ProductInterface\") { name fields { name type { name } } } }"
}
```

(cambiar `"ProductInterface"` por `"CategoryInterface"` u otro tipo
para explorar más)

## 5. Hallazgo adicional: Algolia

El header `Content-Security-Policy` del sitio permite conexiones a:

```
*.algolia.net  *.algolianet.com  *.algolia.io
```

Esto indica que el **buscador del frontend usa Algolia**, no
GraphQL/REST de Magento. Las *Search API Keys* de Algolia están
diseñadas por Algolia para ser públicas (se embeben a propósito en
el JS del cliente), y esa ruta no pasa por el WAF de EPA en absoluto.

**Pendiente:** sacar el `Application ID` y la `Search API Key` desde
el código fuente o el Network tab del navegador (buscar "algolia").

## 6. Campos confirmados en `ProductInterface`

Vía introspección, el 27/07/2026:

```
canonical_url, categories, country_of_manufacture, crosssell_products,
description, gift_message_available, image, media_gallery,
meta_description, meta_keyword, meta_title, name, new_from_date,
new_to_date, only_x_left_in_stock, options_container, price_range,
price_tiers, product_links, rating_summary, related_products,
review_count, reviews, short_description, sku, small_image,
special_price, special_to_date, stock_status, swatch_image,
thumbnail, uid, upsell_products, url_key, url_rewrites, url_suffix
```

## 7. Queries validadas (200 OK con datos reales)

**Config de la tienda:**
```json
{ "query": "{ storeConfig { store_code base_currency_code } }" }
```

**Búsqueda de productos con los campos útiles para un tracker:**
```json
{
  "query": "query($q: String!) { products(search: $q, pageSize: 10) { items { sku name special_price stock_status only_x_left_in_stock price_range { minimum_price { regular_price { value } final_price { value } } } small_image { url } url_key } } }",
  "variables": { "q": "taladro" }
}
```

## 8. Repo construido: `epa-cli`

- Stack: **TypeScript estricto**, Node 18+, ESM
- Patrón: **Repository / Ports & Adapters**
  - `domain/` — `Product` (entidad) y `ProductRepository` (interfaz/puerto)
  - `infrastructure/graphql/` — cliente HTTP genérico, mapper DTO→dominio,
    implementación concreta contra EPA
  - `cli/` — menú interactivo con flechas (`@inquirer/prompts`) y
    formato de salida (`chalk`)
  - `index.ts` — composition root (aquí se elige qué repository usar)
- Validado: `tsc --noEmit` sin errores en modo strict, 4/4 tests
  unitarios del mapper pasando, binario compilado probado en vivo
- Entregado como `epa-cli.zip`

## 9. Riesgos / consideraciones

- No es un API oficial documentada por EPA — es lo que consume su
  propio frontend
- Revisar términos y condiciones del sitio antes de un uso que vaya
  más allá de lo personal
- Evitar requests en volumen/loop sin pausas (riesgo de rate limit o
  bloqueo de IP más agresivo)
- El schema puede cambiar sin aviso (Magento no lo versiona
  públicamente)

## 10. Próximos pasos posibles (sin empezar todavía)

- Comando para consultar por SKU exacto
- Caché local (SQLite/JSON) para trackear cambios de precio en el tiempo
- `AlgoliaProductRepository` como segunda implementación del mismo puerto
- Paginación cuando `total_count` supere el `pageSize`
