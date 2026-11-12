import {
  CardGridSkeleton,
  FilterChipsSkeleton,
  HeaderSkeleton,
  PageSkeleton,
} from "@/components/shared/Skeletons";

export default function LeaguesLoading() {
  return (
    <PageSkeleton label="Loading leagues…">
      <HeaderSkeleton />
      <FilterChipsSkeleton count={4} />
      <CardGridSkeleton count={6} />
    </PageSkeleton>
  );
}
