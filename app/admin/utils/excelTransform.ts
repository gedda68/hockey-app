// app/admin/utils/excelTransform.ts

import { Roster } from "../types";

/**
 * Transform Excel data to Roster format
 *
 * Expected Excel columns:
 * - Age Group (required)
 * - Team Name (required)
 * - Player Name (required)
 * - Club (optional)
 * - Icon (optional)
 *
 * Example:
 * | Age Group | Team Name  | Player Name | Club           | Icon              |
 * |-----------|------------|-------------|----------------|-------------------|
 * | Under 18  | Green Team | John Smith  | Brisbane HC    | /icons/brisbane.png |
 * | Under 18  | Green Team | Jane Doe    | Gold Coast HC  | /icons/goldcoast.png |
 * | Under 18  | Gold Team  | Bob Jones   | Brisbane HC    | /icons/brisbane.png |
 */

export function transformExcelToRoster(data: any[]): Partial<Roster>[] {
  // Group data by age group
  const grouped = data.reduce((acc: any, row: any) => {
    // Get age group (support multiple column name formats)
    const ageGroup = row["Age Group"] || row["ageGroup"] || row["age_group"];

    if (!ageGroup) {
      console.warn("Row missing age group, skipping:", row);
      return acc;
    }

    // Initialize age group if not exists
    if (!acc[ageGroup]) {
      acc[ageGroup] = {
        teams: {},
        shadowPlayers: [],
        withdrawn: [],
      };
    }

    // Get team name (support multiple column name formats)
    const teamName = row["Team Name"] || row["teamName"] || row["team_name"];

    if (!teamName) {
      console.warn("Row missing team name, skipping:", row);
      return acc;
    }

    // Initialize team if not exists
    if (!acc[ageGroup].teams[teamName]) {
      acc[ageGroup].teams[teamName] = {
        players: [],
        staff: {},
      };
    }

    // Get player name (support multiple column name formats)
    const playerName =
      row["Player Name"] || row["playerName"] || row["player_name"];

    if (playerName) {
      // Add player to team
      acc[ageGroup].teams[teamName].players.push({
        name: playerName,
        club: row["Club"] || row["club"] || "",
        icon: row["Icon"] || row["icon"] || "",
      });
    }

    // Optional: Handle staff data if present
    const staffRole =
      row["Staff Role"] || row["staffRole"] || row["staff_role"];
    const staffName =
      row["Staff Name"] || row["staffName"] || row["staff_name"];

    if (staffRole && staffName) {
      const roleKey = staffRole.toLowerCase().replace(/\s+/g, "");
      acc[ageGroup].teams[teamName].staff[roleKey] = {
        name: staffName,
        club:
          row["Staff Club"] ||
          row["staffClub"] ||
          row["Club"] ||
          row["club"] ||
          "",
        icon:
          row["Staff Icon"] ||
          row["staffIcon"] ||
          row["Icon"] ||
          row["icon"] ||
          "",
      };
    }

    return acc;
  }, {});

  // Convert grouped data to Roster array
  return Object.entries(grouped).map(([ageGroup, data]: [string, any]) => ({
    ageGroup,
    lastUpdated: new Date().toLocaleDateString("en-AU"),
    teams: Object.entries(data.teams).map(([name, team]: [string, any]) => ({
      name,
      players: team.players,
      staff: team.staff,
    })),
    shadowPlayers: data.shadowPlayers,
    withdrawn: data.withdrawn,
  }));
}

/**
 * Validate Excel data before transformation
 */
export function validateExcelData(data: any[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push("Excel file is empty");
    return { valid: false, errors };
  }

  // Check required columns
  const firstRow = data[0];
  const hasAgeGroup =
    "Age Group" in firstRow ||
    "ageGroup" in firstRow ||
    "age_group" in firstRow;
  const hasTeamName =
    "Team Name" in firstRow ||
    "teamName" in firstRow ||
    "team_name" in firstRow;
  const hasPlayerName =
    "Player Name" in firstRow ||
    "playerName" in firstRow ||
    "player_name" in firstRow;

  if (!hasAgeGroup) {
    errors.push('Missing required column: "Age Group"');
  }
  if (!hasTeamName) {
    errors.push('Missing required column: "Team Name"');
  }
  if (!hasPlayerName) {
    errors.push('Missing required column: "Player Name"');
  }

  // Check for empty required fields
  data.forEach((row, index) => {
    const ageGroup = row["Age Group"] || row["ageGroup"] || row["age_group"];
    const teamName = row["Team Name"] || row["teamName"] || row["team_name"];
    const playerName =
      row["Player Name"] || row["playerName"] || row["player_name"];

    if (!ageGroup) {
      errors.push(`Row ${index + 2}: Missing age group`);
    }
    if (!teamName) {
      errors.push(`Row ${index + 2}: Missing team name`);
    }
    if (!playerName) {
      errors.push(`Row ${index + 2}: Missing player name`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate Excel template data
 * This can be used to create a downloadable template for users
 */
export function generateExcelTemplate() {
  return [
    {
      "Age Group": "Under 18",
      "Team Name": "Green Team",
      "Player Name": "John Smith",
      Club: "Brisbane Hockey Club",
      Icon: "/icons/brisbane.png",
    },
    {
      "Age Group": "Under 18",
      "Team Name": "Green Team",
      "Player Name": "Jane Doe",
      Club: "Gold Coast Hockey Club",
      Icon: "/icons/goldcoast.png",
    },
    {
      "Age Group": "Under 18",
      "Team Name": "Gold Team",
      "Player Name": "Bob Jones",
      Club: "Brisbane Hockey Club",
      Icon: "/icons/brisbane.png",
    },
    {
      "Age Group": "Under 21",
      "Team Name": "Blue Team",
      "Player Name": "Alice Williams",
      Club: "Sunshine Coast HC",
      Icon: "/icons/sunshine.png",
    },
  ];
}

/**
 * Export roster data to Excel format
 * Converts roster data back to flat Excel structure
 */
export function exportRosterToExcel(rosters: Roster[]) {
  const excelData: any[] = [];

  rosters.forEach((roster) => {
    roster.teams.forEach((team) => {
      // Add players
      team.players.forEach((player) => {
        excelData.push({
          "Age Group": roster.ageGroup,
          "Team Name": team.name,
          "Player Name": player.name,
          Club: player.club,
          Icon: player.icon,
          Type: "Player",
        });
      });

      // Add staff
      const staffRoles = {
        coach: "Coach",
        asstCoach: "Assistant Coach",
        manager: "Manager",
        umpire: "Umpire",
      };

      Object.entries(team.staff).forEach(([role, staff]) => {
        if (staff) {
          excelData.push({
            "Age Group": roster.ageGroup,
            "Team Name": team.name,
            "Player Name": "", // Empty for staff
            Club: staff.club,
            Icon: staff.icon,
            Type: "Staff",
            "Staff Role": staffRoles[role as keyof typeof staffRoles] || role,
            "Staff Name": staff.name,
          });
        }
      });
    });

    // Add shadow players
    roster.shadowPlayers.forEach((player) => {
      excelData.push({
        "Age Group": roster.ageGroup,
        "Team Name": "Shadow Players",
        "Player Name": player.name,
        Club: player.club,
        Icon: player.icon,
        Type: "Shadow Player",
      });
    });

    // Add withdrawn players
    roster.withdrawn.forEach((player) => {
      excelData.push({
        "Age Group": roster.ageGroup,
        "Team Name": "Withdrawn",
        "Player Name": player.name,
        Club: player.club,
        Icon: player.icon,
        Type: "Withdrawn",
        Reason: player.reason,
      });
    });
  });

  return excelData;
}
