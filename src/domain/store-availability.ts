/**
 * Entidad de dominio. A diferencia de `Product`, esto NO sale de la API
 * de EPA - sale de parsear el HTML público de la página de producto
 * (ver infrastructure/html/). Es información best-effort: puede fallar
 * o quedar desactualizada si EPA cambia el tema del sitio.
 */
export interface StoreAvailabilityEntry {
  city: string;
  available: boolean;
}
