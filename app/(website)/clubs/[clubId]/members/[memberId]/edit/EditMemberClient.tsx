// app/(website)/clubs/[clubId]/members/[memberId]/edit/EditMemberClient.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddMemberForm from "../../new/AddMemberForm";

interface EditMemberClientProps {
  clubId: string;
  memberId: string;
}

export default function EditMemberClient({
  clubId,
  memberId,
}: EditMemberClientProps) {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMember();
  }, [clubId, memberId]);

  const fetchMember = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Member not found");
        }
        throw new Error("Failed to load member");
      }

      const data = await res.json();
      setMember(data);

      console.log("✅ Loaded member for editing:", data.memberId);
    } catch (err: any) {
      console.error("Error fetching member:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = (updatedMember: any) => {
    console.log("✅ Member updated successfully:", updatedMember.memberId);
    // Redirect to member list after successful update
    router.push(`/clubs/${clubId}/members`);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#06054e] mx-auto mb-4"></div>
        <p className="text-lg font-bold text-slate-600">Loading member...</p>
        <p className="text-sm text-slate-500 mt-2">Member ID: {memberId}</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
        <p className="text-lg font-bold text-red-600 mb-4">
          {error || "Member not found"}
        </p>
        <p className="text-sm text-slate-500 mb-6">Member ID: {memberId}</p>
        <button
          onClick={() => router.push(`/clubs/${clubId}/members`)}
          className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
        >
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <AddMemberForm
      clubId={clubId}
      mode="edit"
      initialData={member}
      onSuccess={handleSuccess}
    />
  );
}
