# epa-cli

CLI interactivo por si te sientes superior al resto de la humanidad por quere usar el cli para todo, en esta ocasión para consultar el catálogo de [Ferretería EPA Venezuela](https://ve.epaenlinea.com)
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
  Salir
```

Elige "Buscar productos", escribe un término (ej. `taladro`), y te lista SKU,
nombre, precio (con el precio de oferta tachado si aplica), disponibilidad y
el link directo al producto.

Para compilar y correr la versión de producción:

```bash
npm run build
npm start
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
    product-repository.ts        Interfaz ProductRepository (el "puerto")

  infrastructure/graphql/     — Adaptador concreto contra EPA.
    types.ts                     DTOs crudos, tal cual los devuelve Magento
    queries.ts                   Strings de las queries GraphQL
    epa-graphql-client.ts        Transporte HTTP genérico (no sabe qué es un "producto")
    product-mapper.ts            Función pura: DTO crudo -> Product de dominio
    epa-product-repository.ts    Implementa ProductRepository usando el client + mapper

  cli/                        — Presentación. Depende de ProductRepository, no de EPA.
    menu.ts                      Loop del menú interactivo (@inquirer/prompts)
    format.ts                    Impresión bonita en terminal (chalk)

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

## Próximos pasos posibles

- Comando para consultar un SKU específico (`getBySku`)
- Caché local (SQLite o JSON) para trackear cambios de precio en el tiempo
- Un `AlgoliaProductRepository` alternativo
- Paginación en el menú cuando `total_count` sea mayor al `pageSize`

## Aviso

Este proyecto consume un endpoint público del frontend de EPA, no una API
oficial documentada por ellos. Revisa sus
[términos y condiciones](https://ve.epaenlinea.com/terminos-y-condiciones)
antes de darle un uso más allá de lo personal, y no hagas requests en
volumen/loop sin pausas entre ellas.
