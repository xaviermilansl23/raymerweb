/** @param {number} current @param {number} total @returns {(number|'gap')[]} */
export function paginationItems(current, total) {
  const last = Math.max(1, Math.floor(total));
  const page = Math.max(1, Math.min(Math.floor(current), last));
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', last];
  if (page >= last - 3) return [1, 'gap', last - 4, last - 3, last - 2, last - 1, last];
  return [1, 'gap', page - 1, page, page + 1, 'gap', last];
}
