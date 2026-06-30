'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, onBack, rightAction }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="h-12 flex items-center gap-3 px-4">
        <button
          onClick={handleBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Kembali"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
          )}
        </div>
        {rightAction && (
          <div className="flex-shrink-0">{rightAction}</div>
        )}
      </div>
    </div>
  );
}
