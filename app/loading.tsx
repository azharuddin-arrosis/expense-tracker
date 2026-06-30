import { PageSkeleton } from '@/components/PageSkeleton';

export default function DashboardLoading() {
  return <PageSkeleton header={false} cards={3} lines={2} hasPie />;
}
