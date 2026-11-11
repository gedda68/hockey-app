// app/(website)/clubs/[clubId]/members/page.tsx
// Members list page

import { Suspense } from "react";
import MembersList from "./MembersListClient";

interface PageProps {
  params: Promise<{
    clubId: string;
  }>;
}

export default async function MembersPage({ params }: PageProps) {
  const { clubId } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#06054e] mb-2">Members</h1>
        <p className="text-lg text-slate-600 font-bold">
          Everyone in the club — players, coaches, umpires, committee and volunteers — with their teams and positions
        </p>
      </div>

      <Suspense fallback={<p className="text-slate-500">Loading members…</p>}>
        <MembersList clubId={clubId} />
      </Suspense>
    </div>
  );
}
