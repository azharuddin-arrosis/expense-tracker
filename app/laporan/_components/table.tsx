export function THead({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div
      className={`grid ${cols} gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider`}
    >
      {labels.map((l, i) => (
        <div
          key={i}
          className={`px-2.5 py-1.5 ${
            i < labels.length - 1 ? 'border-r border-gray-200' : ''
          } ${i > 0 ? 'text-right' : ''}`}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

export function TRow({
  cols,
  cells,
  isEven,
  isLast,
  emptyValue = '-',
}: {
  cols: string;
  cells: (string | number | { value: string | number; className?: string })[];
  isEven: boolean;
  isLast?: boolean;
  emptyValue?: string;
}) {
  const hasData = cells.some((c) => {
    if (typeof c === 'object') return c.value !== 0 && c.value !== '-' && c.value !== '';
    return c !== 0 && c !== '-' && c !== '';
  });
  return (
    <div
      className={`grid ${cols} gap-0 text-[11px] ${
        !isLast ? 'border-b border-gray-100' : ''
      } ${isEven ? 'bg-white' : 'bg-gray-50/50'} ${!hasData ? 'opacity-40' : ''}`}
    >
      {cells.map((c, i) => {
        const val = typeof c === 'object' ? c.value : c;
        const extraClass = typeof c === 'object' ? c.className ?? '' : '';
        const display = (val === 0 || val === '0') && i > 0 ? emptyValue : val;
        return (
          <div
            key={i}
            className={`px-2.5 py-2 ${
              i < cells.length - 1 ? 'border-r border-gray-100' : ''
            } ${i > 0 ? 'text-right tabular-nums' : 'text-gray-700 font-medium'} ${extraClass}`}
          >
            {display}
          </div>
        );
      })}
    </div>
  );
}

export function TFooter({
  cols,
  cells,
}: {
  cols: string;
  cells: (string | number | { value: string | number; className?: string })[];
}) {
  return (
    <div
      className={`grid ${cols} gap-0 border-t border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-900`}
    >
      {cells.map((c, i) => {
        const val = typeof c === 'object' ? c.value : c;
        const extraClass = typeof c === 'object' ? c.className ?? '' : '';
        return (
          <div
            key={i}
            className={`px-2.5 py-1.5 ${
              i < cells.length - 1 ? 'border-r border-gray-200' : ''
            } ${i > 0 ? 'text-right tabular-nums' : 'text-gray-500'}`}
          >
            <span className={extraClass || undefined}>{val}</span>
          </div>
        );
      })}
    </div>
  );
}
