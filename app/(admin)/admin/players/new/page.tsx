// app/admin/players/new/page.tsx
import PlayerForm from "@/components/admin/players/PlayerForm";

export const metadata = {
  title: "New Player - Hockey Management",
  description: "Register a new player",
};

export default function NewPlayerPage() {
  return <PlayerForm mode="new" />;
}
