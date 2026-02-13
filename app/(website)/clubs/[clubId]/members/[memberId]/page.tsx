// app/(website)/clubs/[clubId]/members/[memberId]/page.tsx
// Server component for member view page

import MemberViewClient from "./MemberViewClient";

interface PageProps {
  params: Promise<{
    clubId: string;
    memberId: string;
  }>;
}

export default async function MemberViewPage({ params }: PageProps) {
  const { clubId, memberId } = await params;

  return <MemberViewClient clubId={clubId} memberId={memberId} />;
}
