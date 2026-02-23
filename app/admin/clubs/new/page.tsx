// app/admin/clubs/new/page.tsx
// Create new club page

import ClubForm from "@/components/admin/clubs/ClubForm";

async function getAssociations() {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/admin/associations`,
      {
        cache: "no-store",
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
  const associations = await getAssociations();

  return <ClubForm associations={associations} />;
}
