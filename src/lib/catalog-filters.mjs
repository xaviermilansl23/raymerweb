/** @param {string} value */
export const textKey = value => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** @param {unknown} value */
export function stockUnits(value) {
  const number = Number(value);
  const units = Math.floor(number);
  return Number.isSafeInteger(units) && units > 0 ? units : 0;
}

/** @param {import('./models').Producto} product */
export const hasAvailableStock = product => stockUnits(product.stock_disponible) > 0;

/**
 * Las opciones de un grupo se combinan con O; los grupos se combinan con Y.
 * @param {readonly import('./models').Producto[]} products
 * @param {{ categories: string[], brands: string[], query: string, min: string, max: string, sort: string }} filters
 */
export function filterProducts(products, filters) {
  const needle = textKey(filters.query);
  return products.filter(product => {
    if (!hasAvailableStock(product)) return false;
    const category = product.tipo_producto_id == null ? 'none' : String(product.tipo_producto_id);
    const brand = product.marca?.trim() ? textKey(product.marca) : 'none';
    return (!filters.categories.length || filters.categories.includes(category)) &&
      (!filters.brands.length || filters.brands.includes(brand)) &&
      (filters.min === '' || product.precio_venta >= Number(filters.min)) &&
      (filters.max === '' || product.precio_venta <= Number(filters.max)) &&
      (!needle || textKey([product.nombre, product.marca, product.modelo, product.tipo_producto_nombre, product.descripcion].filter(Boolean).join(' ')).includes(needle));
  }).sort((a, b) => filters.sort === 'price-up' ? a.precio_venta - b.precio_venta : filters.sort === 'price-down' ? b.precio_venta - a.precio_venta : a.nombre.localeCompare(b.nombre));
}
