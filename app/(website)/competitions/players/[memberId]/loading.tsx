import {
  CardGridSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/shared/Skeletons";

export default function PlayerProfileLoading() {
  return (
    <PageSkeleton label="Loading player…">
      <div className="mx-auto max-w-5xl">
        <HeaderSkeleton subtitle={false} />
        <CardGridSkeleton count={3} className="mb-8" />
        <TableSkeleton rows={4} columns={7} />
      </div>
    </PageSkeleton>
  );
}
