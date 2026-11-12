import {
  DetailSkeleton,
  PaperPageSkeleton,
} from "@/components/shared/Skeletons";

export default function TournamentLoading() {
  return (
    <PaperPageSkeleton label="Loading tournament…" widthClass="max-w-7xl">
      <DetailSkeleton paragraphs={6} />
    </PaperPageSkeleton>
  );
}
