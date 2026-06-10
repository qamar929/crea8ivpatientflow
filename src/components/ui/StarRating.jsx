import { Star } from 'lucide-react';

const sizeMap = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export default function StarRating({ rating = 0, size = 'md', interactive = false, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  const iconClass = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => {
        const filled = star <= Math.floor(rating);
        const partial = !filled && star === Math.ceil(rating) && rating % 1 > 0;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange && onChange(star)}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          >
            <Star
              className={`${iconClass} ${
                filled
                  ? 'text-amber-400 fill-amber-400'
                  : partial
                  ? 'text-amber-300 fill-amber-200'
                  : 'text-gray-200 fill-gray-100'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
