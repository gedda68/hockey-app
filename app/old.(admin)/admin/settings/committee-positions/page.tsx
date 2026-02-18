// app/(admin)/admin/settings/committee-positions/page.tsx
// Server component wrapper that renders within admin layout

import CommitteePositionsClient from "./CommitteePositionsClient";

export const metadata = {
  title: "Committee Positions | Settings",
  description: "Manage committee positions configuration",
};

export default function CommitteePositionsPage() {
  return <CommitteePositionsClient />;
}
