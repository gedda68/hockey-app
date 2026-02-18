// app/(admin)/admin/config/gender/page.tsx
"use client";

import { useState, useEffect } from "react";
import { UserCircle } from "lucide-react";
import ConfigTable, { ConfigItem } from "@/components/admin/config/ConfigTable";
import { toast } from "sonner";

export default function GenderConfigPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/gender");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      console.log("📥 Raw API response:", data);
      console.log("📥 First item:", data[0]);
      console.log("📥 First item ID:", data[0]?.id);

      // Just use the data as-is from the API
      setItems(data);
    } catch (error) {
      console.error("Error fetching genders:", error);
      toast.error("Failed to load gender options");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    console.log("➕ Creating gender:", data);

    const res = await fetch("/api/admin/config/gender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create");
    }

    toast.success("Gender option created successfully");
  };

  const handleEdit = async (id: string, data: any) => {
    console.log("✏️ Editing gender ID:", id);
    console.log("✏️ Edit data:", data);

    const res = await fetch("/api/admin/config/gender", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update");
    }

    toast.success("Gender option updated successfully");
  };

  const handleDelete = async (id: string, name: string) => {
    console.log("🗑️ Deleting gender ID:", id);

    const res = await fetch(`/api/admin/config/gender?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete");
    }

    toast.success("Gender option deleted successfully");
  };

  const handleToggleActive = async (item: ConfigItem) => {
    console.log("🔄 Toggling active for ID:", item.id);

    const res = await fetch("/api/admin/config/gender", {
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
      `Gender option ${!item.isActive ? "activated" : "deactivated"}`,
    );
  };

  return (
    <ConfigTable
      items={items}
      isLoading={isLoading}
      configType="gender"
      title="Gender Options"
      icon={UserCircle}
      singularName="Gender Option"
      fields={[
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "e.g., Male, Female, Non-binary",
        },
        {
          name: "code",
          label: "Code",
          type: "text",
          required: false,
          placeholder: "e.g., M, F, NB",
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
