// app/(admin)/admin/users/page.tsx
// User management page wrapper

import UsersManagementContent from "./UsersManagementContent";

export const metadata = {
  title: "User Management | Hockey Admin",
  description: "Manage user accounts and permissions",
};

export default function UsersPage() {
  return <UsersManagementContent />;
}
