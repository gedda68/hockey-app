import StandingsTableClient from "./StandingsTableClient";
import type { Division } from "../../types";

interface StandingsTableProps {
  division: Division | null;
  selectedDiv: string;
  availableYears: string[];
  currentYear: string;
  showYearFilter?: boolean;
}

export default function StandingsTable(props: StandingsTableProps) {
  return <StandingsTableClient {...props} />;
}
