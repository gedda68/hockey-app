import {
  DetailSkeleton,
  PageSkeleton,
} from "@/components/shared/Skeletons";

export default function MatchCentreLoading() {
  return (
    <PageSkeleton label="Loading match…">
      <DetailSkeleton tone="dark" paragraphs={5} />
    </PageSkeleton>
  );
}
