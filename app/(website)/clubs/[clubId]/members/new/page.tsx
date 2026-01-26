// app/(website)/clubs/[clubId]/members/new/page.tsx

import AddMemberForm from "./AddMemberForm";

interface PageProps {
  params: {
    clubId: string;
  };
}

export default async function NewMemberPage({ params }: PageProps) {
  const { clubId } = await params;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#06054e]">Add New Member</h1>
          <p className="text-slate-600 mt-2">
            Complete all required information
          </p>
        </div>

        <AddMemberForm clubId={clubId} mode="create" />
      </div>
    </div>
  );
}
