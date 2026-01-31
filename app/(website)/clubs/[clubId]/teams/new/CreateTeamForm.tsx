// app/(website)/clubs/[clubId]/teams/new/CreateTeamForm.tsx
// Create new team form

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

interface CreateTeamFormProps {
  clubId: string;
  clubName: string;
}

const SENIOR_DIVISIONS = [
  { name: "Division 1", level: 1, shortName: "Div1" },
  { name: "Division 2", level: 2, shortName: "Div2" },
  { name: "Division 3", level: 3, shortName: "Div3" },
  { name: "Division 4", level: 4, shortName: "Div4" },
  { name: "Division 5", level: 5, shortName: "Div5" },
];

const JUNIOR_DIVISIONS = [
  { name: "Under 18", level: 1, shortName: "U18" },
  { name: "Under 16", level: 2, shortName: "U16" },
  { name: "Under 14", level: 3, shortName: "U14" },
  { name: "Under 12", level: 4, shortName: "U12" },
  { name: "Under 10", level: 5, shortName: "U10" },
];

const MASTERS_DIVISIONS = [
  { name: "Masters 1", level: 1, shortName: "M1" },
  { name: "Masters 2", level: 2, shortName: "M2" },
  { name: "Masters 3", level: 3, shortName: "M3" },
];

export default function CreateTeamForm({
  clubId,
  clubName,
}: CreateTeamFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "mixed">("mixed");
  const [ageCategory, setAgeCategory] = useState<
    "junior" | "senior" | "masters"
  >("senior");
  const [divisionIndex, setDivisionIndex] = useState(0);
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [competition, setCompetition] = useState("");
  const [grade, setGrade] = useState("");
  const [homeGround, setHomeGround] = useState("");

  // Get divisions based on age category
  const getDivisions = () => {
    switch (ageCategory) {
      case "junior":
        return JUNIOR_DIVISIONS;
      case "masters":
        return MASTERS_DIVISIONS;
      default:
        return SENIOR_DIVISIONS;
    }
  };

  const divisions = getDivisions();
  const selectedDivision = divisions[divisionIndex];

  // Auto-generate team name
  const generateTeamName = () => {
    const div = divisions[divisionIndex];
    const genderPrefix =
      gender === "mixed"
        ? ""
        : `${gender.charAt(0).toUpperCase() + gender.slice(1)} `;
    return `${genderPrefix}${div.name}`;
  };

  // Handle division change
  const handleDivisionChange = (index: number) => {
    setDivisionIndex(index);
    if (!name) {
      setName(generateTeamName());
    }
  };

  // Handle age category change
  const handleAgeCategoryChange = (
    category: "junior" | "senior" | "masters"
  ) => {
    setAgeCategory(category);
    setDivisionIndex(0);
    if (!name) {
      setName(generateTeamName());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/clubs/${clubId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          name: name || generateTeamName(),
          gender,
          ageCategory,
          division: selectedDivision,
          season,
          competition: competition || undefined,
          grade: grade || undefined,
          homeGround: homeGround || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create team");
      }

      const team = await res.json();
      router.push(`/clubs/${clubId}/teams/${team.teamId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/clubs/${clubId}/teams`}
          className="inline-flex items-center gap-2 text-slate-600 font-bold hover:text-[#06054e] mb-4"
        >
          <ArrowLeft size={20} />
          Back to Teams
        </Link>

        <h1 className="text-4xl font-black text-[#06054e]">Create New Team</h1>
        <p className="text-lg text-slate-600 font-bold mt-1">{clubName}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={24}
              className="text-red-600 flex-shrink-0 mt-1"
            />
            <div>
              <h3 className="text-lg font-black text-red-800 mb-1">
                Error Creating Team
              </h3>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-6">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Age Category */}
            <div className="md:col-span-2">
              <label className="block text-sm font-black uppercase text-slate-600 mb-3">
                Age Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["junior", "senior", "masters"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleAgeCategoryChange(cat)}
                    className={`px-6 py-4 rounded-xl font-black transition-all ${
                      ageCategory === cat
                        ? "bg-[#06054e] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Division */}
            <div className="md:col-span-2">
              <label className="block text-sm font-black uppercase text-slate-600 mb-3">
                Division / Grade <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {divisions.map((div, index) => (
                  <button
                    key={div.shortName}
                    type="button"
                    onClick={() => handleDivisionChange(index)}
                    className={`px-4 py-3 rounded-xl font-black transition-all ${
                      divisionIndex === index
                        ? "bg-yellow-400 text-[#06054e]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {div.shortName}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500 font-bold mt-2">
                Selected: {selectedDivision.name}
              </p>
            </div>

            {/* Gender */}
            <div className="md:col-span-2">
              <label className="block text-sm font-black uppercase text-slate-600 mb-3">
                Gender
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["male", "female", "mixed"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      gender === g
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Team Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={generateTeamName()}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
              />
              <p className="text-sm text-slate-500 font-bold mt-1">
                Leave blank to auto-generate: "{generateTeamName()}"
              </p>
            </div>

            {/* Season */}
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Season <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2024"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Competition Details */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6">
          <h2 className="text-2xl font-black text-[#06054e] mb-6">
            Competition Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Competition */}
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Competition
              </label>
              <input
                type="text"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                placeholder="Brisbane Hockey League"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
              />
            </div>

            {/* Grade */}
            <div>
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Grade
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="A Grade"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
              />
            </div>

            {/* Home Ground */}
            <div className="md:col-span-2">
              <label className="block text-sm font-black uppercase text-slate-600 mb-2">
                Home Ground
              </label>
              <input
                type="text"
                value={homeGround}
                onChange={(e) => setHomeGround(e.target.value)}
                placeholder="Perry Park"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 focus:border-yellow-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-[2rem] border-2 border-blue-200 p-6">
          <h3 className="text-lg font-black text-slate-700 mb-4">
            Team Preview
          </h3>
          <div className="space-y-2">
            <p className="font-bold text-slate-600">
              <span className="text-slate-500">Display Name:</span> {clubName} -{" "}
              {name || generateTeamName()}
            </p>
            <p className="font-bold text-slate-600">
              <span className="text-slate-500">Category:</span>{" "}
              {ageCategory.charAt(0).toUpperCase() + ageCategory.slice(1)}
            </p>
            <p className="font-bold text-slate-600">
              <span className="text-slate-500">Division:</span>{" "}
              {selectedDivision.name} ({selectedDivision.shortName})
            </p>
            <p className="font-bold text-slate-600">
              <span className="text-slate-500">Gender:</span>{" "}
              {gender.charAt(0).toUpperCase() + gender.slice(1)}
            </p>
            <p className="font-bold text-slate-600">
              <span className="text-slate-500">Season:</span> {season}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/clubs/${clubId}/teams`}
            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Save size={20} />
                Create Team
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
