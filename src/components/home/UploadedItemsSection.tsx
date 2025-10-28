import { UploadedItemCard } from "@/components/home/UploadedItemCard";

interface UploadedItemsSectionProps {
  items: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  onClear(): void;
}

export function UploadedItemsSection(
  props: UploadedItemsSectionProps
) {
  const { items, onClear } = props;
  if (items.length === 0) return null;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Recent Uploads ({items.length})
          </h2>
          <button
            onClick={onClear}
            className="text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <UploadedItemCard key={index} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
