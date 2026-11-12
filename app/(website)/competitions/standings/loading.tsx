import {
  HeaderSkeleton,
  PageSkeleton,
  SkeletonBlock,
  TableSkeleton,
} from "@/components/shared/Skeletons";

export default function StandingsLoading() {
  return (
    <PageSkeleton label="Loading standings…">
      <HeaderSkeleton />
      <SkeletonBlock className="mb-8 h-9 w-56 rounded-full" />
      <div className="mx-auto max-w-4xl">
        <TableSkeleton rows={10} columns={5} />
      </div>
    </PageSkeleton>
  );
}
