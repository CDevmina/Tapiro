import { Product } from "../data/products"; // Make sure path is correct
import { ProductCard } from "./ProductCard"; // Import ProductCard

interface ProductListProps {
  products: Product[];
  onProductClick?: (product: Product) => void; // Pass click handler down
  recommendedProductIds?: Set<string>; // Set of IDs to highlight
}

export function ProductList({
  products,
  onProductClick,
  recommendedProductIds = new Set(),
}: ProductListProps) {
  if (!products || products.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400">
        No products found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onProductClick={onProductClick}
          isRecommended={recommendedProductIds.has(product.id)}
        />
      ))}
    </div>
  );
}
