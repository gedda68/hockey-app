import {
  CardGridSkeleton,
  HeaderSkeleton,
  PageSkeleton,
} from "@/components/shared/Skeletons";

export default function TournamentsLoading() {
  return (
    <PageSkeleton label="Loading tournaments…">
      <HeaderSkeleton />
      <CardGridSkeleton count={6} />
    </PageSkeleton>
  );
}
