// app/(website)/clubs/[clubId]/members/page.tsx
// Members list page

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
          Manage your club members
        </p>
      </div>

      <MembersList clubId={clubId} />
    </div>
  );
}
