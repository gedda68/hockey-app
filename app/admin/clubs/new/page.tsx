// app/admin/clubs/new/page.tsx
// Create new club page

import { headers } from "next/headers";
import ClubForm from "@/components/admin/clubs/ClubForm";

async function getAssociations(cookie: string) {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/admin/associations`,
      {
        cache: "no-store",
        headers: cookie ? { cookie } : {},
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    return data.associations || [];
  } catch (error) {
    console.error("Error fetching associations:", error);
    return [];
  }
}

export default async function NewClubPage() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const associations = await getAssociations(cookie);

  return <ClubForm associations={associations} />;
}
