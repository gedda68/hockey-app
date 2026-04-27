import VolunteerDutyRosterClient from "@/components/admin/clubs/VolunteerDutyRosterClient";

export default async function ClubVolunteerDutyRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VolunteerDutyRosterClient clubRef={id} />;
}

