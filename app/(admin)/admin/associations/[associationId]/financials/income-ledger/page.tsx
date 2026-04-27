import { AssociationIncomeLedgerClient } from "@/components/admin/finance/AssociationIncomeLedgerClient";

export default async function AssociationIncomeLedgerPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  return <AssociationIncomeLedgerClient associationId={associationId} />;
}

