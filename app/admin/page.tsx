// app/admin/page.tsx
// Root /admin redirect — sends all users to the dashboard.
// The dashboard itself is role-aware and adjusts its content per user scope.

import { redirect } from "next/navigation";

export default function AdminRootPage() {
  redirect("/admin/dashboard");
}
