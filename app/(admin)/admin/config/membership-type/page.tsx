// app/(admin)/admin/config/membership-types/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";
import ConfigTable, { ConfigItem } from "@/components/admin/config/ConfigTable";
import { toast } from "sonner";

export default function MembershipTypesConfigPage() {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/membership-type");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      console.log("📥 Raw API response:", data);
      setItems(data);
    } catch (error) {
      console.error("Error fetching membership types:", error);
      toast.error("Failed to load membership types");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    console.log("➕ Creating membership type:", data);

    const res = await fetch("/api/admin/config/membership-type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create");
    }

    toast.success("Membership type created successfully");
  };

  const handleEdit = async (id: string, data: any) => {
    console.log("✏️ Editing membership type ID:", id);

    const res = await fetch("/api/admin/config/membership-type", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update");
    }

    toast.success("Membership type updated successfully");
  };

  const handleDelete = async (id: string, name: string) => {
    console.log("🗑️ Deleting membership type ID:", id);

    const res = await fetch(`/api/admin/config/membership-type?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete");
    }

    toast.success("Membership type deleted successfully");
  };

  const handleToggleActive = async (item: ConfigItem) => {
    console.log("🔄 Toggling active for ID:", item.id);

    const res = await fetch("/api/admin/config/membership-type", {
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
      `Membership type ${!item.isActive ? "activated" : "deactivated"}`,
    );
  };

  return (
    <ConfigTable
      items={items}
      isLoading={isLoading}
      configType="membership-type"
      title="Membership Types"
      icon={CreditCard}
      singularName="Membership Type"
      fields={[
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "e.g., Junior, Senior, Social",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: false,
          placeholder: "Describe this membership type",
        },
        {
          name: "annualFee",
          label: "Annual Fee (AUD)",
          type: "number",
          required: false,
          placeholder: "e.g., 150",
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
