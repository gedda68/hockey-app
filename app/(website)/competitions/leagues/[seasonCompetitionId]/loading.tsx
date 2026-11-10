import {
  CardGridSkeleton,
  HeaderSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/shared/Skeletons";

export default function LeagueHubLoading() {
  return (
    <PageSkeleton label="Loading league…">
      <HeaderSkeleton />
      <CardGridSkeleton count={3} className="mb-8" />
      <TableSkeleton rows={8} columns={5} />
    </PageSkeleton>
  );
}
