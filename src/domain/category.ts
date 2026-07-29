/**
 * Entidad de dominio. No sabe nada de GraphQL ni de Magento.
 */
export interface CategorySummary {
  uid: string;
  name: string;
  urlKey: string;
  productCount: number;
  childrenCount: number;
}

export interface CategoryListing {
  /** La categoría consultada. `null` solo puede pasar si `getChildren` lo devuelve así. */
  current: CategorySummary;
  children: CategorySummary[];
}
