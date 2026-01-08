import StandingsTableClient from "./StandingsTableClient";
import type { Division, Season } from "../../types";

interface StandingsTableProps {
  division: Division | null;
  selectedDiv: string;
  seasons: Season[];
  currentYear: string;
}

export default function StandingsTable(props: StandingsTableProps) {
  return <StandingsTableClient {...props} />;
}
