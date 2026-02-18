// app/(admin)/admin/settings/fee-categories/page.tsx
// Server component wrapper that renders within admin layout

import FeeCategoriesClient from "./FeeCategoriesClient";

export const metadata = {
  title: "Fee Categories | Settings",
  description: "Manage fee categories configuration",
};

export default function FeeCategoriesPage() {
  return <FeeCategoriesClient />;
}
