import AssociationsList from "@/components/admin/associations/AssociationsList";

export default function AssociationsPage() {
  return (
    <div className="p-6">
      <AssociationsList />
    </div>
  );
}

export const metadata = {
  title: "Associations | Hockey Admin",
  description: "Manage hockey associations hierarchy",
};
