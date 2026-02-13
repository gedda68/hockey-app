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
      console.log(`🔍 Fetching member: ${memberId} from club: ${clubId}`);
      const url = `/api/clubs/${clubId}/members/${memberId}`;
      console.log(`📡 URL: ${url}`);

      const res = await fetch(url);

      console.log(`📊 Response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error(`❌ Error response:`, errorData);

        if (res.status === 404) {
          throw new Error(
            errorData.hint || errorData.error || "Member not found",
          );
        }
        if (res.status === 403) {
          throw new Error(
            "Access denied. You don't have permission to view this member.",
          );
        }
        throw new Error(
          errorData.error || `Failed to load member (${res.status})`,
        );
      }

      const data = await res.json();
      console.log(
        `✅ Member loaded:`,
        data.personalInfo?.firstName,
        data.personalInfo?.lastName,
      );
      setMember(data);
    } catch (err: any) {
      console.error("❌ Error fetching member:", err);
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
        <p className="text-sm text-slate-500 mt-2">Club: {clubId}</p>
        <p className="text-sm text-slate-500">Member: {memberId}</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">❌</span>
        </div>
        <p className="text-lg font-bold text-red-600 mb-4">
          {error || "Member not found"}
        </p>
        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-slate-600 font-mono">
            <strong>Club ID:</strong> {clubId}
          </p>
          <p className="text-sm text-slate-600 font-mono">
            <strong>Member ID:</strong> {memberId}
          </p>
          <p className="text-sm text-slate-600 font-mono mt-2">
            <strong>URL:</strong> /api/clubs/{clubId}/members/{memberId}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/clubs/${clubId}/members`)}
            className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            Back to Members
          </button>
          <button
            onClick={fetchMember}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
          >
            Try Again
          </button>
        </div>
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
