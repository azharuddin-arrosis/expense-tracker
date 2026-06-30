'use client';

interface PageSkeletonProps {
  header?: boolean;
  cards?: number;
  lines?: number;
  hasPie?: boolean;
}

export function PageSkeleton({ header = true, cards = 1, lines = 3, hasPie = false }: PageSkeletonProps) {
  return (
    <div className="px-4 pt-4 pb-6 space-y-5 animate-pulse">
      {header && (
        <div className="h-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-200" />
          <div className="h-5 w-32 bg-gray-200 rounded-lg" />
        </div>
      )}

      {/* Gradient hero card skeleton */}
      <div className="rounded-2xl bg-gray-200 h-32" />

      {/* 3x2 quick action grid skeleton */}
      <div className="grid grid-cols-3 gap-y-4 gap-x-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-13 h-13 rounded-2xl bg-gray-200" />
            <div className="h-3 w-14 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Content cards skeleton */}
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          {Array.from({ length: lines }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
          ))}
        </div>
      ))}

      {hasPie && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="h-4 w-44 bg-gray-100 rounded" />
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-100" />
                <div className="h-3 flex-1 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
