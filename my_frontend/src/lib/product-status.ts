export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export function getProductStatus(stock: number): ProductStatus {
  if (stock === 0) {
    return 'Out of Stock';
  }

  if (stock <= 20) {
    return 'Low Stock';
  }

  return 'In Stock';
}
