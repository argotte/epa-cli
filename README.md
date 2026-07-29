# epa-cli

![EPA CLI Logo](src/assets/epacli.jpg)

CLI interactivo por si te sientes superior al resto de la humanidad por querer usar el cli para todo, en esta ocasión para consultar el catálogo de [Ferretería EPA Venezuela](https://ve.epaenlinea.com)
vía su endpoint GraphQL público (`/graphql`).

## Uso

```bash
npm install
npm run dev
```

Te va a salir un menú navegable con flechas (↑↓ + Enter):

```
? ¿Qué quieres hacer?
❯ Buscar productos
  Buscar por SKU
  Salir
```

**Buscar productos** — escribe un término (ej. `taladro`) y te lista SKU,
nombre, precio (con el precio de oferta tachado si aplica, formateado con la
moneda de la tienda), disponibilidad y el link directo al producto, con un
encabezado `N resultados — página P de T`. Si hay más de una página, te ofrece
"Siguiente página" / "Página anterior" sin tener que repetir la búsqueda.

**Buscar por SKU** — escribe el SKU exacto (ej. `VE-1001010`) y te trae ese
producto puntual, si existe.

Mientras espera la respuesta de EPA, el CLI muestra un spinner (se
desactiva solo si la salida no es una terminal, por ejemplo al redirigir a
un archivo).

Para compilar y correr la versión de producción:

```bash
npm run build
npm start
```

También se puede instalar como comando global:

```bash
npm link
epa
```

## Por qué necesita un User-Agent de navegador

`ve.epaenlinea.com` corre detrás de CloudFront con lo que parece ser un WAF
(AWS WAF o similar). Requests con el User-Agent por defecto de `curl` (o sin
ningún User-Agent) reciben un 403 con una página estática de "mantenimiento"
en vez de la respuesta real — confirmado empíricamente, no es que el sitio
esté caído. `GraphQLClient` ya manda un User-Agent de navegador real por
defecto para evitar esto. Si en el futuro empieza a fallar de nuevo, ese es
el primer sospechoso.

## Arquitectura (Repository / Ports & Adapters)

```
src/
  domain/                     — Puerto. No sabe nada de HTTP ni GraphQL.
    product.ts                   Entidad Product, tipos (Money, StockStatus...)
    product-repository.ts        Interfaz ProductRepository (el "puerto"): search
                                  paginado + getBySku

  config.ts                   — StoreConfig (moneda, locale, sufijo de URL, base
                                 URL) y sus defaults, usado tanto por el mapper
                                 como por el formato de salida.

  infrastructure/graphql/     — Adaptador concreto contra EPA.
    types.ts                     DTOs crudos, tal cual los devuelve Magento
    queries.ts                   Strings de las queries GraphQL
    epa-graphql-client.ts        Transporte HTTP genérico (timeout de 10s +
                                  1 reintento en fallos de red/5xx; nunca en
                                  403 ni en errores GraphQL)
    store-config.ts              Trae storeConfig (moneda, locale, sufijo de URL)
    product-mapper.ts            Función pura: DTO crudo -> Product de dominio
    epa-product-repository.ts    Implementa ProductRepository usando el client +
                                  mapper; getBySku busca por texto y filtra el
                                  match exacto (ver por qué en "Próximos pasos")

  cli/                        — Presentación. Depende de ProductRepository, no de EPA.
    menu.ts                      Loop del menú interactivo (@inquirer/prompts):
                                  buscar, buscar por SKU, paginar resultados
    format.ts                    Impresión bonita en terminal (chalk), precios
                                  formateados con Intl.NumberFormat según la
                                  moneda/locale de la tienda
    spinner.ts                   Spinner sin dependencias mientras se consulta EPA

  index.ts                    — Composition root: aquí se decide qué
                                 implementación concreta usar.
```

**Por qué está separado así:** el CLI (`cli/menu.ts`) solo conoce la interfaz
`ProductRepository` — no importa `EpaProductRepository`, ni GraphQL, ni
`fetch` en ningún lado. Eso significa:

- **Cambiar la fuente de datos no toca el CLI.** Si mañana quieres consumir
  Algolia en vez de GraphQL (que también vimos que EPA usa para el buscador),
  escribes `AlgoliaProductRepository implements ProductRepository` en
  `infrastructure/algolia/` y cambias dos líneas en `index.ts`. El CLI, el
  formato de salida y los tests del mapper no se enteran.
- **Se puede reusar en NestJS.** `domain/product-repository.ts` es una
  interfaz plana de TypeScript — puedes envolver `EpaProductRepository` en
  un `@Injectable()` con un provider de NestJS (`{ provide: PRODUCT_REPOSITORY,
  useClass: EpaProductRepository }`) sin cambiar una línea de esta lógica.
- **Tests sin red.** `product-mapper.ts` es una función pura (DTO in, Product
  out) — por eso `product-mapper.test.ts` prueba los casos importantes
  (agotado, con oferta, sin imagen) sin mockear `fetch` ni nada de HTTP.

## Descubrir más campos (introspección)

EPA no desactivó la introspección de GraphQL, así que puedes seguir
explorando el esquema tú mismo. Ejemplo para ver los campos de categorías:

```json
{
  "query": "{ __type(name: \"CategoryInterface\") { name fields { name type { name } } } }"
}
```

Mándalo por Postman (o agrega un método nuevo al `GraphQLClient`) contra
`https://ve.epaenlinea.com/graphql`.

## Limitaciones confirmadas del schema

Por si en el futuro se te ocurre agregarlas y perder tiempo — esto ya se probó
contra el endpoint real (29/07/2026) y **no funciona**:

- **No hay filtro por SKU** en `ProductAttributeFilterInput` (solo acepta
  `category_id`, `category_uid`, `created_at`, `news_from_date`,
  `news_to_date`, `price`, `url_key`). Por eso "Buscar por SKU" internamente
  hace `search: <sku>` y filtra el match exacto en el cliente.
- **No se puede ordenar por precio del lado del servidor.**
  `ProductAttributeSortInput` solo admite `name`, `position`, `relevance` —
  aunque `sort_fields` anuncie `price` como default, el input type lo
  rechaza. El sitio ordena por precio vía Algolia, no vía esta API.
- `pickupLocations` devuelve siempre `total_count: 0` — no hay store locator
  por API; las tiendas físicas son páginas CMS (`/tiendas/*.html`).

## Próximos pasos posibles

- Modo no interactivo con flags/subcomandos (`epa buscar taladro --json`) para
  usar el CLI en scripts, además del menú
- Explorar categorías con flechas (el árbol completo ya es consultable vía
  `categories`) y refinar resultados por las facetas de precio/categoría que
  trae `aggregations`
- Ficha de detalle de producto (descripción, galería, relacionados)
- Caché local (SQLite o JSON) para trackear cambios de precio en el tiempo
- Un `AlgoliaProductRepository` alternativo

## Aviso

Este proyecto consume un endpoint público del frontend de EPA, no una API
oficial documentada por ellos. Revisa sus
[términos y condiciones](https://ve.epaenlinea.com/terminos-y-condiciones)
antes de darle un uso más allá de lo personal, y no hagas requests en
volumen/loop sin pausas entre ellas.
