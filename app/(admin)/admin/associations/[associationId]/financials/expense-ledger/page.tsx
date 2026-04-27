import { AssociationExpenseLedgerClient } from "@/components/admin/finance/AssociationExpenseLedgerClient";

export default async function AssociationExpenseLedgerPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  return <AssociationExpenseLedgerClient associationId={associationId} />;
}
