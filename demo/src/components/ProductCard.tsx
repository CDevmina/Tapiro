import { Product } from "../data/products"; // Make sure path is correct

interface ProductCardProps {
  product: Product;
  onProductClick?: (product: Product) => void; // Handler for clicks
  onPurchaseClick?: (product: Product) => void; // Handler for purchase clicks
  recommendationLevel?: "high" | "medium" | null; // Updated prop
  categoryNameMap: Record<string, string>;
}

export function ProductCard({
  product,
  onProductClick,
  onPurchaseClick,
  recommendationLevel, // Updated prop
  categoryNameMap,
}: ProductCardProps) {
  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event from firing
    if (onPurchaseClick) {
      onPurchaseClick(product);
    }
  };

  return (
    <div
      className={`relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white shadow-md transition-shadow duration-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
        recommendationLevel === "high"
          ? "border-blue-500 ring-2 ring-blue-300 dark:border-blue-400"
          : recommendationLevel === "medium"
          ? "border-yellow-500 ring-2 ring-yellow-300 dark:border-yellow-400"
          : "border-gray-200"
      }`}
      onClick={handleCardClick}
      title={`Simulate View: ${product.name}`}
    >
      {recommendationLevel && (
        <div
          className={`absolute top-2 right-2 rounded px-2 py-1 text-xs font-bold text-white ${
            recommendationLevel === "high" ? "bg-blue-500" : "bg-yellow-500"
          }`}
        >
          Recommended
        </div>
      )}
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-48 w-full object-cover"
      />
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
            {product.name}
          </h3>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Category:{" "}
            {categoryNameMap[product.categoryId] || product.categoryId}
          </p>
          {product.description && (
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
              {product.description}
            </p>
          )}
        </div>
        <p className="mt-2 text-lg font-bold text-blue-600 dark:text-blue-400">
          ${product.price.toFixed(2)}
        </p>
        {onPurchaseClick && (
          <button
            onClick={handlePurchase}
            className="mt-3 w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Buy Now
          </button>
        )}
      </div>
    </div>
  );
}
