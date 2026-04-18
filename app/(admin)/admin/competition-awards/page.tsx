import type { Metadata } from "next";
import CompetitionAwardsAdminClient from "@/components/admin/CompetitionAwardsAdminClient";

export const metadata: Metadata = {
  title: "Competition awards | Admin",
  description:
    "Manage player of the match and season or tournament awards, including display names and history.",
};

export default function CompetitionAwardsAdminPage() {
  return <CompetitionAwardsAdminClient />;
}
