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

En ambos flujos podés seleccionar "Ver detalle de un producto" (Enter sobre
uno de la lista) para ver su ficha completa: descripción larga, categoría,
precio, disponibilidad, calificación/reseñas si tiene, vigencia de la oferta
si aplica, **disponibilidad por tienda física** ("Disponible en: Maracaibo,
Valencia..."), y productos relacionados — que a su vez se pueden abrir con
Enter, encadenando fichas.

La disponibilidad por tienda **no sale de GraphQL** (confirmado que no existe
ahí, ver "Limitaciones confirmadas del schema") — sale de un scraping
best-effort del HTML público de la página de producto
(`HtmlStoreAvailabilityRepository`), porque ese dato viene renderizado
server-side por Magento y no hay ningún endpoint (ni GraphQL ni REST) que lo
exponga. Es la única parte del CLI que no habla con `/graphql`, y a propósito
está aislada en su propio adaptador: si el theme de EPA cambia y el scraping
deja de matchear, la ficha sigue mostrando todo lo demás con una nota
("no se pudo determinar") en vez de romperse. La tabla de "Características"
(dimensiones, etc.) **no** se agregó — es la misma historia (renderizada
server-side, sin API), pero no vale la pena scrapearla también por ahora.

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

## Modo scriptable (flags)

Sin argumentos, `epa` abre el menú interactivo. Con argumentos, ejecuta el
comando y termina — útil para scripts y pipes:

```bash
epa buscar taladro                          # igual que el menú, en una línea
epa buscar taladro --min 100 --max 200      # filtro de precio
epa buscar --categoria taladros             # sin texto, solo por categoría
epa buscar taladro --orden nombre-asc       # orden alfabético
epa sku VE-1001010                          # un producto puntual
epa categorias                              # categorías de primer nivel
epa categorias herramientas                 # subcategorías de "herramientas"
epa promos                                  # categoría Promociones
epa promos --liquidacion                    # categoría Liquidación
```

Formato de salida, en cualquier comando:

```bash
epa buscar taladro --formato tabla          # una fila por producto, compacto
epa buscar taladro --json                   # JSON puro en stdout, para jq/scripts
epa buscar taladro --json | jq '.[].sku'
```

Con `--json`, stdout no lleva nada más que el JSON (ni el resumen "N
resultados", ni colores) — todo lo demás va a stderr. `--no-color` desactiva
los colores en cualquier formato. El código de salida indica el resultado:
`0` con resultados, `2` sin resultados, `1` si hubo un error. Ver `epa --help`
para la lista completa de opciones (`--page`, `--size`, `--min`, `--max`,
`--categoria`, `--orden`).

## Por qué necesita un User-Agent de navegador

`ve.epaenlinea.com` corre detrás de CloudFront con lo que parece ser un WAF
(AWS WAF o similar). Requests con el User-Agent por defecto de `curl` (o sin
ningún User-Agent) reciben un 403 con una página estática de "mantenimiento"
en vez de la respuesta real — confirmado empíricamente, no es que el sitio
esté caído. `GraphQLClient` ya manda un User-Agent de navegador real por
defecto para evitar esto. Si en el futuro empieza a fallar de nuevo, ese es
el primer sospechoso.

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
- **La tabla de "Características" y el "Disponible en: [ciudades]"** que se
  ven en la página de un producto **no existen en `ProductInterface` ni en
  ninguno de sus tipos concretos** (`SimpleProduct`, `BundleProduct`, etc. -
  reconfirmado por introspección el 29/07/2026, mismos campos que la
  interfaz genérica). Confirmado además que **no hay ninguna llamada
  GraphQL/REST/AJAX de por medio** para ninguna de las dos: inspeccionando
  la red del navegador al cargar una página de producto real, cero requests
  aparte de assets estáticos - y el HTML devuelto por un `curl` plano (sin
  JS) ya trae ambos bloques completos. Es contenido 100% renderizado
  server-side por Magento en la plantilla PHP del tema. La disponibilidad
  por tienda sí se consigue en el CLI (ver arriba, `HtmlStoreAvailabilityRepository`)
  scrapeando ese HTML; "Características" no se implementó.
- **Promociones y Liquidación son categorías normales**, no un endpoint
  aparte: `epa promos` usa `category_uid` `NDQ0` (Promociones) y `NjM2`
  (Liquidación), confirmados por consulta directa el 29/07/2026 — si EPA
  reorganiza el catálogo estos ids podrían cambiar.

## Próximos pasos posibles

- Explorar categorías con flechas en el menú interactivo (`epa categorias`
  ya lista una categoría a la vez desde flags; falta la navegación tipo
  árbol con `select` dentro del menú)
- Refinar resultados por las facetas de precio/categoría que trae
  `aggregations` (ahora mismo `--min/--max/--categoria` hay que conocerlos
  de antemano, no se sugieren solos como en el sitio)
- Caché local (SQLite o JSON) para trackear cambios de precio en el tiempo
- Un `AlgoliaProductRepository` alternativo

## Aviso

Este proyecto consume un endpoint público del frontend de EPA, no una API
oficial documentada por ellos. Revisa sus
[términos y condiciones](https://ve.epaenlinea.com/terminos-y-condiciones)
antes de darle un uso más allá de lo personal, y no hagas requests en
volumen/loop sin pausas entre ellas.
