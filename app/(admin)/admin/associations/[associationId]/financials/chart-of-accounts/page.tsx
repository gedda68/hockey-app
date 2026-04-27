import { AssociationCoaClient } from "@/components/admin/finance/AssociationCoaClient";

export default async function AssociationChartOfAccountsPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  return <AssociationCoaClient associationId={associationId} />;
}

