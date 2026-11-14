import MemberRegistrationView from "@/components/admin/registrations/MemberRegistrationView";

export default async function MemberRegistrationAdminPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  return <MemberRegistrationView memberId={memberId} />;
}
