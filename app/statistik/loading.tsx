import { PageSkeleton } from '@/components/PageSkeleton';

export default function StatistikLoading() {
  return <PageSkeleton header cards={3} lines={2} hasPie />;
}
