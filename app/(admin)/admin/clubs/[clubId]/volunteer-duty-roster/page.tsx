import VolunteerDutyRosterClient from "@/components/admin/clubs/VolunteerDutyRosterClient";

export default async function ClubVolunteerDutyRosterPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <VolunteerDutyRosterClient clubRef={clubId} />;
}
