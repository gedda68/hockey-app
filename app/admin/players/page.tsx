// app/admin/players/page.tsx
import PlayersList from "@/components/admin/players/PlayersList";

export const metadata = {
  title: "Players - Hockey Management",
  description: "Manage player registrations and details",
};

export default function PlayersPage() {
  return <PlayersList />;
}
