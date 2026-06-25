'use client';

import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>
      )}
    </div>
  );
}
