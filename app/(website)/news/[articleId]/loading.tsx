import {
  DetailSkeleton,
  PaperPageSkeleton,
} from "@/components/shared/Skeletons";

export default function ArticleLoading() {
  return (
    <PaperPageSkeleton label="Loading article…">
      <DetailSkeleton paragraphs={8} />
    </PaperPageSkeleton>
  );
}
