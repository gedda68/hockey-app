import {
  ListRowsSkeleton,
  PaperPageSkeleton,
  SkeletonBlock,
} from "@/components/shared/Skeletons";

export default function NewsLoading() {
  return (
    <PaperPageSkeleton label="Loading news…">
      <SkeletonBlock tone="light" className="mb-4 h-2.5 w-16" />
      <SkeletonBlock tone="light" className="mb-3 h-10 w-48" />
      <SkeletonBlock tone="light" className="mb-8 h-3 w-72 max-w-full" />
      <ListRowsSkeleton tone="light" rows={5} />
    </PaperPageSkeleton>
  );
}
