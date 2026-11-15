// app/(admin)/admin/nominate/page.tsx
// Nominations inside the admin shell, so the sidebar matches the signed-in role.

import NominatePortal from "@/components/nominations/NominatePortal";

export default function AdminNominatePage() {
  return <NominatePortal embedded />;
}
