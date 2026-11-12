import {
  CardGridSkeleton,
  FilterChipsSkeleton,
  HeaderSkeleton,
  PageSkeleton,
} from "@/components/shared/Skeletons";

export default function AwardsLoading() {
  return (
    <PageSkeleton label="Loading awards…">
      <HeaderSkeleton />
      <FilterChipsSkeleton count={3} />
      <CardGridSkeleton count={6} />
    </PageSkeleton>
  );
}
