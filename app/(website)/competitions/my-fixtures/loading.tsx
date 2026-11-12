import {
  HeaderSkeleton,
  ListRowsSkeleton,
  PageSkeleton,
} from "@/components/shared/Skeletons";

export default function MyFixturesLoading() {
  return (
    <PageSkeleton label="Loading your fixtures…">
      <HeaderSkeleton />
      <ListRowsSkeleton rows={5} />
    </PageSkeleton>
  );
}
