import type { CategoryListing } from "./category.js";

/**
 * Puerto de dominio para navegar el árbol de categorías. Separado de
 * ProductRepository porque son dos agregados distintos del catálogo -
 * el CLI puede depender de uno sin el otro.
 */
export interface CategoryRepository {
  /**
   * Sin `urlKey` devuelve la raíz del catálogo. Devuelve `null` si el
   * `urlKey` pedido no existe.
   */
  getChildren(urlKey?: string): Promise<CategoryListing | null>;
}
