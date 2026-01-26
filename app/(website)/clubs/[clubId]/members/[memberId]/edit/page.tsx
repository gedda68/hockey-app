// app/(website)/clubs/[clubId]/members/[memberId]/edit/page.tsx

import EditMemberClient from "./EditMemberClient";

interface PageProps {
  params: {
    clubId: string;
    memberId: string;
  };
}

export default async function EditMemberPage({ params }: PageProps) {
  const { clubId, memberId } = await params;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#06054e]">Edit Member</h1>
          <p className="text-slate-600 mt-2">Update member information</p>
        </div>

        <EditMemberClient clubId={clubId} memberId={memberId} />
      </div>
    </div>
  );
}
