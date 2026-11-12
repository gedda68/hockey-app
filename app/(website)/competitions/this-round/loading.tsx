import {
  FilterChipsSkeleton,
  HeaderSkeleton,
  ListRowsSkeleton,
  PageSkeleton,
} from "@/components/shared/Skeletons";

export default function ThisRoundLoading() {
  return (
    <PageSkeleton label="Loading this round…">
      <HeaderSkeleton />
      <FilterChipsSkeleton count={4} />
      <ListRowsSkeleton rows={6} />
    </PageSkeleton>
  );
}
