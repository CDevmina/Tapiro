import { Product } from "../data/products"; // Make sure path is correct

interface ProductCardProps {
  product: Product;
  onProductClick?: (product: Product) => void; // Handler for clicks
  onPurchaseClick?: (product: Product) => void; // Handler for purchase clicks
  isRecommended?: boolean; // Optional flag for highlighting
}

export function ProductCard({
  product,
  onProductClick,
  onPurchaseClick,
  isRecommended,
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
        isRecommended
          ? "border-blue-500 ring-2 ring-blue-300 dark:border-blue-400"
          : "border-gray-200"
      }`}
      onClick={handleCardClick}
      title={`Simulate View: ${product.name}`}
    >
      {isRecommended && (
        <div className="absolute top-2 right-2 rounded bg-blue-500 px-2 py-1 text-xs font-bold text-white">
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
            Category: {product.categoryId}
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
            className="mt-3 w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Buy Now
          </button>
        )}
      </div>
    </div>
  );
}
