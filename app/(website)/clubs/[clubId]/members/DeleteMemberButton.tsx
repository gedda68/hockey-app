"use client"; // This allows the onClick handler

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${memberName}?`)) {
      try {
        const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          router.refresh();
        } else {
          toast.error("Failed to delete member");
        }
      } catch {
        toast.error("Failed to delete member");
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
