import MatchCardSkeleton from "./MatchCardSkeleton";

interface MatchListSkeletonProps {
  count?: number;
}

export default function MatchListSkeleton({
  count = 5,
}: MatchListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}
