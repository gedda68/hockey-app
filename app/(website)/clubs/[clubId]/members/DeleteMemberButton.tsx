"use client"; // This allows the onClick handler

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCustomAlert } from "@/components/ui/CustomAlert";

interface DeleteButtonProps {
  clubId: string;
  memberId: string;
  memberName: string;
}

export default function DeleteMemberButton({
  clubId,
  memberId,
  memberName,
}: DeleteButtonProps) {
  const router = useRouter();

  const { showAlert, AlertComponent } = useCustomAlert();

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${memberName}?`)) {
      try {
        const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          // Refresh the current server component data without a full page reload
          router.refresh();
        } else {
          showAlert("error", "Delete Error", "Failed to delete member.");
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="p-2 hover:bg-red-50 rounded-lg transition-all"
      title="Delete member"
    >
      <Trash2 size={18} className="text-red-500" />
    </button>
  );
}
