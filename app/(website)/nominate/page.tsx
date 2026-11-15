// app/(website)/nominate/page.tsx
// Public nomination portal. Signed-in users are sent to /admin/nominate so they get the sidebar
// for their role; everyone else sees the public version.

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import NominatePortal from "@/components/nominations/NominatePortal";

export default async function NominatePage() {
  const session = await getSession();
  if (session?.memberId) redirect("/admin/nominate");
  return <NominatePortal />;
}
