// app/admin/clubs/edit/[id]/EditClubPageClient.tsx
// Edit club page client component using reusable form

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClubForm from "@/components/admin/clubs/ClubForm";
import { PageHeader } from "@/components/admin/forms/FormComponents";
import { toast } from "sonner";

export default function EditClubPageClient({ id }: { id: string }) {
  const router = useRouter();
  const [clubData, setClubData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadClubData();
  }, [id]);

  const loadClubData = async () => {
    try {
      const response = await fetch(`/api/admin/clubs/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load club");
      }
      const data = await response.json();
      setClubData(data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to load club data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch(`/api/admin/clubs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id,
          userId: "admin", // TODO: Get from session
          userName: "Admin User", // TODO: Get from session
          reason: "Club details updated",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update club");
      }

      toast.success("Club updated successfully!");
      router.push("/admin/clubs");
    } catch (error: any) {
      console.error("Error updating club:", error);
      toast.error(error.message || "Failed to update club");
      throw error;
    }
  };

  const handleCancel = () => {
    router.push("/admin/clubs");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-slate-600">
            Loading club data...
          </p>
        </div>
      </div>
    );
  }

  if (error || !clubData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-red-800 mb-2">Error</h2>
            <p className="text-red-700 font-bold mb-4">
              {error || "Club not found"}
            </p>
            <button
              onClick={() => router.push("/admin/clubs")}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
            >
              Back to Clubs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={`Edit ${clubData.name || "Club"}`}
          description="Update club information"
          backLink={{ href: "/admin/clubs", label: "Back to Clubs" }}
          actions={
            <a
              href={`/clubs/${clubData.slug || clubData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-all"
            >
              View Public Page →
            </a>
          }
        />

        <ClubForm
          mode="edit"
          initialData={clubData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
