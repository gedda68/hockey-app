// app/admin/clubs/new/page.tsx
// Create new club page

"use client";

import { useRouter } from "next/navigation";
import ClubForm from "@/components/admin/clubs/ClubForm";
import { PageHeader } from "@/components/admin/forms/FormComponents";
import { toast } from "sonner";

export default function CreateClubPage() {
  const router = useRouter();

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userId: "admin", // TODO: Get from session
          userName: "Admin User", // TODO: Get from session
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create club");
      }

      const result = await response.json();
      toast.success("Club created successfully!");
      router.push(`/admin/clubs/edit/${result.club.id}`);
    } catch (error: any) {
      console.error("Error creating club:", error);
      toast.error(error.message || "Failed to create club");
      throw error;
    }
  };

  const handleCancel = () => {
    router.push("/admin/clubs");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Create New Club"
          description="Add a new club to the system"
          backLink={{ href: "/admin/clubs", label: "Back to Clubs" }}
        />

        <ClubForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
