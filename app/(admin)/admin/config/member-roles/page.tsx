// app/(admin)/admin/config/member-roles/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import ConfigTable, { ConfigItem } from "@/components/admin/config/ConfigTable";
import { toast } from "sonner";

export default function MemberRolesConfigPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/member-role");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      console.log("📥 Raw API response:", data);
      setItems(data);
    } catch (error) {
      console.error("Error fetching member roles:", error);
      toast.error("Failed to load member roles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    console.log("➕ Creating member role:", data);

    const res = await fetch("/api/admin/config/member-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create");
    }

    toast.success("Member role created successfully");
  };

  const handleEdit = async (id: string, data: any) => {
    console.log("✏️ Editing member role ID:", id);

    const res = await fetch("/api/admin/config/member-role", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update");
    }

    toast.success("Member role updated successfully");
  };

  const handleDelete = async (id: string, name: string) => {
    console.log("🗑️ Deleting member role ID:", id);

    const res = await fetch(`/api/admin/config/member-role?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete");
    }

    toast.success("Member role deleted successfully");
  };

  const handleToggleActive = async (item: ConfigItem) => {
    console.log("🔄 Toggling active for ID:", item.id);

    const res = await fetch("/api/admin/config/member-role", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        isActive: !item.isActive,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update status");
    }

    toast.success(
      `Member role ${!item.isActive ? "activated" : "deactivated"}`,
    );
  };

  return (
    <ConfigTable
      items={items}
      isLoading={isLoading}
      configType="member-role"
      title="Member Roles"
      icon={Users}
      singularName="Member Role"
      fields={[
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "e.g., Player, Coach, Manager",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: false,
          placeholder: "What does this role do?",
        },
        {
          name: "category",
          label: "Category",
          type: "select",
          required: true,
          options: [
            { value: "Participant", label: "Participant" },
            { value: "Official", label: "Official" },
            { value: "Administrator", label: "Administrator" },
            { value: "Support", label: "Support" },
          ],
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleActive={handleToggleActive}
      onRefresh={fetchItems}
    />
  );
}
