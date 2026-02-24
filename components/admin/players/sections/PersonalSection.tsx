// sections/PersonalSection.tsx
// COMPLETE: Player duplicate check + Member linking + Type-ahead Gender from Config

"use client";

import { useState, useEffect } from "react";
import FormField from "../shared/FormField";
import { BaseSectionProps, calculateAge, isMinor } from "../types/player.types";
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle,
  Search,
  ExternalLink,
  Loader2,
  Link as LinkIcon,
  X,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ExistingMember {
  memberId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  clubId: string;
  clubName?: string;
  membershipStatus: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  address?: any;
}

interface ExistingPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  clubId: string;
  clubName?: string;
  active: boolean;
  registrationStatus: string;
  linkedMemberId?: string;
}

interface ConfigOption {
  _id?: string;
  configType: string;
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
}

export default function PersonalSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const router = useRouter();
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const playerIsMinor = formData.dateOfBirth
    ? isMinor(formData.dateOfBirth)
    : false;

  const [isCheckingMembers, setIsCheckingMembers] = useState(false);
  const [isCheckingPlayers, setIsCheckingPlayers] = useState(false);
  const [similarMembers, setSimilarMembers] = useState<ExistingMember[]>([]);
  const [existingPlayers, setExistingPlayers] = useState<ExistingPlayer[]>([]);
  const [showMemberCheck, setShowMemberCheck] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [linkedMemberId, setLinkedMemberId] = useState<string | null>(
    (formData as any).linkedMemberId || null,
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"both" | "first" | "last">(
    "both",
  );
  const [autoFillComplete, setAutoFillComplete] = useState(false);

  // Gender type-ahead state
  const [genderOptions, setGenderOptions] = useState<ConfigOption[]>([]);
  const [loadingGenders, setLoadingGenders] = useState(true);
  const [genderSearch, setGenderSearch] = useState(formData.gender || "");

  // Fetch gender options from config API
  useEffect(() => {
    const fetchGenderOptions = async () => {
      try {
        console.log("📋 Fetching gender options from config...");
        const res = await fetch("/api/admin/config/");

        if (res.ok) {
          const genders = await res.json();
          console.log(`✅ Loaded ${genders.length} gender options`);
          console.log("📦 Sample gender:", genders[0]);

          // Filter active and sort by displayOrder
          const activeGenders = genders
            .filter((g: ConfigOption) => g.isActive !== false)
            .filter((g: ConfigOption) => g.configType === "gender")
            .sort(
              (a: ConfigOption, b: ConfigOption) =>
                (a.displayOrder || 0) - (b.displayOrder || 0),
            );

          setGenderOptions(activeGenders);
        } else {
          console.warn("⚠️ Could not load genders, using fallback");
          setGenderOptions([
            {
              configType: "gender",
              id: "gender-male",
              name: "Male",
              code: "M",
              isActive: true,
              displayOrder: 1,
            },
            {
              configType: "gender",
              id: "gender-female",
              name: "Female",
              code: "F",
              isActive: true,
              displayOrder: 2,
            },
            {
              configType: "gender",
              id: "gender-non-binary",
              name: "Non-binary",
              code: "NB",
              isActive: true,
              displayOrder: 3,
            },
            {
              configType: "gender",
              id: "gender-other",
              name: "Other",
              code: "OTH",
              isActive: true,
              displayOrder: 4,
            },
          ]);
        }
      } catch (error) {
        console.error("❌ Error loading genders:", error);
        setGenderOptions([
          {
            configType: "gender",
            id: "gender-male",
            name: "Male",
            code: "M",
            isActive: true,
            displayOrder: 1,
          },
          {
            configType: "gender",
            id: "gender-female",
            name: "Female",
            code: "F",
            isActive: true,
            displayOrder: 2,
          },
        ]);
      } finally {
        setLoadingGenders(false);
      }
    };

    fetchGenderOptions();
  }, []);

  // Filter genders based on search
  const getFilteredGenders = (searchTerm: string) => {
    if (!searchTerm) return genderOptions;
    const lower = searchTerm.toLowerCase();
    return genderOptions.filter(
      (gender) =>
        (gender.name?.toLowerCase() || "").includes(lower) ||
        (gender.code?.toLowerCase() || "").includes(lower),
    );
  };

  // Fetch club name by ID
  const fetchClubName = async (clubId: string): Promise<string> => {
    if (!clubId) return "No Club";

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}`);
      if (!res.ok) return "Unknown Club";
      const data = await res.json();
      return data.club?.name || data.name || "Unknown Club";
    } catch (error) {
      return "Unknown Club";
    }
  };

  // Auto-fill data from linked member
  const autoFillFromMember = async (member: ExistingMember) => {
    console.log("📝 Auto-filling data from member:", member.memberId);

    // Auto-fill all available fields
    if (member.firstName) onChange("firstName", member.firstName);
    if (member.lastName) onChange("lastName", member.lastName);
    if (member.dateOfBirth) onChange("dateOfBirth", member.dateOfBirth);
    if (member.email) onChange("email", member.email);
    if (member.phone) onChange("phone", member.phone);
    if (member.clubId) onChange("clubId", member.clubId);

    if (member.address) {
      if (member.address.street) onChange("street", member.address.street);
      if (member.address.suburb) onChange("suburb", member.address.suburb);
      if (member.address.city) onChange("city", member.address.city);
      if (member.address.state) onChange("state", member.address.state);
      if (member.address.postcode)
        onChange("postcode", member.address.postcode);
      if (member.address.country)
        onChange("country", member.address.country || "Australia");
    }

    if (member.photoUrl) onChange("photo", member.photoUrl);

    setAutoFillComplete(true);
    console.log("✅ Auto-fill complete");
  };

  // Check for existing players AND members
  useEffect(() => {
    const checkForExisting = async () => {
      const firstName = formData.firstName?.trim() || "";
      const lastName = formData.lastName?.trim() || "";

      // Determine search mode
      let mode: "both" | "first" | "last" = "both";
      if (firstName.length >= 2 && lastName.length < 2) {
        mode = "first";
      } else if (lastName.length >= 2 && firstName.length < 2) {
        mode = "last";
      } else if (firstName.length >= 2 && lastName.length >= 2) {
        mode = "both";
      } else {
        setSimilarMembers([]);
        setExistingPlayers([]);
        setShowMemberCheck(false);
        setCheckError(null);
        return;
      }

      setSearchMode(mode);
      setShowMemberCheck(true);
      setIsCheckingMembers(true);
      setIsCheckingPlayers(true);
      setCheckError(null);

      try {
        console.log(
          `🔍 Checking for existing players AND members (mode: ${mode}):`,
          { firstName, lastName },
        );

        let searchQuery = "";
        if (mode === "both") {
          searchQuery = `${firstName} ${lastName}`;
        } else if (mode === "first") {
          searchQuery = firstName;
        } else {
          searchQuery = lastName;
        }

        // Check BOTH players and members simultaneously
        const [playersRes, membersRes] = await Promise.all([
          fetch(
            `/api/admin/players?search=${encodeURIComponent(searchQuery)}&limit=50`,
          ),
          fetch(
            `/api/admin/members?search=${encodeURIComponent(searchQuery)}&limit=50`,
          ),
        ]);

        // Process Players
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          const players = playersData.players || playersData || [];

          if (Array.isArray(players)) {
            const similarPlayers = players.filter((p: any) => {
              const pFirstName = (p.firstName || "").toLowerCase().trim();
              const pLastName = (p.lastName || "").toLowerCase().trim();
              const inputFirst = firstName.toLowerCase();
              const inputLast = lastName.toLowerCase();

              if (p.playerId === formData.playerId) return false;

              if (mode === "both") {
                const firstMatch =
                  pFirstName.includes(inputFirst) ||
                  inputFirst.includes(pFirstName);
                const lastMatch =
                  pLastName.includes(inputLast) ||
                  inputLast.includes(pLastName);
                return firstMatch && lastMatch;
              } else if (mode === "first") {
                return (
                  pFirstName.includes(inputFirst) ||
                  inputFirst.includes(pFirstName)
                );
              } else {
                return (
                  pLastName.includes(inputLast) || inputLast.includes(pLastName)
                );
              }
            });

            const playersWithClubs = await Promise.all(
              similarPlayers.map(async (p: any) => ({
                ...p,
                clubName: p.clubId ? await fetchClubName(p.clubId) : "No Club",
              })),
            );

            setExistingPlayers(playersWithClubs);
            console.log(`⚠️ Found ${playersWithClubs.length} existing players`);
          }
        }

        setIsCheckingPlayers(false);

        // Process Members
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          const members = membersData.members || membersData || [];

          if (Array.isArray(members)) {
            const similar = members.filter((m: any) => {
              const mFirstName = (
                m.personalInfo?.firstName ||
                m.firstName ||
                ""
              )
                .toLowerCase()
                .trim();
              const mLastName = (m.personalInfo?.lastName || m.lastName || "")
                .toLowerCase()
                .trim();
              const inputFirst = firstName.toLowerCase();
              const inputLast = lastName.toLowerCase();

              if (mode === "both") {
                const firstMatch =
                  mFirstName.includes(inputFirst) ||
                  inputFirst.includes(mFirstName);
                const lastMatch =
                  mLastName.includes(inputLast) ||
                  inputLast.includes(mLastName);
                return firstMatch && lastMatch;
              } else if (mode === "first") {
                return (
                  mFirstName.includes(inputFirst) ||
                  inputFirst.includes(mFirstName)
                );
              } else {
                return (
                  mLastName.includes(inputLast) || inputLast.includes(mLastName)
                );
              }
            });

            const transformedMembers = await Promise.all(
              similar.map(async (m: any) => {
                const isActive =
                  m.membership?.status === "active" ||
                  m.membershipStatus === "active" ||
                  (m.membership && !m.membership.endDate);

                const clubId = m.clubId || "";
                const clubName = clubId
                  ? await fetchClubName(clubId)
                  : "No Club";

                return {
                  memberId: m.memberId || m.id || m._id,
                  firstName: m.personalInfo?.firstName || m.firstName || "",
                  lastName: m.personalInfo?.lastName || m.lastName || "",
                  displayName:
                    m.personalInfo?.displayName ||
                    m.displayName ||
                    `${m.personalInfo?.firstName || m.firstName} ${m.personalInfo?.lastName || m.lastName}`,
                  dateOfBirth:
                    m.personalInfo?.dateOfBirth || m.dateOfBirth || "",
                  clubId: clubId,
                  clubName: clubName,
                  membershipStatus: isActive ? "active" : "inactive",
                  photoUrl: m.personalInfo?.photoUrl || m.photoUrl || "",
                  email: m.contact?.email || m.email || "",
                  phone: m.contact?.phone || m.phone || "",
                  address: m.address || null,
                };
              }),
            );

            setSimilarMembers(transformedMembers);
            console.log(
              `✅ Found ${transformedMembers.length} similar members`,
            );

            // AUTO-FILL: If exactly one active member found and no existing players, auto-link and fill
            if (
              transformedMembers.length === 1 &&
              transformedMembers[0].membershipStatus === "active" &&
              existingPlayers.length === 0 &&
              !linkedMemberId &&
              !autoFillComplete
            ) {
              const member = transformedMembers[0];
              console.log(
                "🔗 Auto-linking to single active member:",
                member.displayName,
              );

              onChange("linkedMemberId", member.memberId);
              setLinkedMemberId(member.memberId);
              await autoFillFromMember(member);

              alert(
                `✅ Auto-linked to member: ${member.displayName}\n🏢 Club: ${member.clubName}\n\nData has been pre-filled from their member record.`,
              );
            }
          }
        }
      } catch (error) {
        console.error("❌ Error checking for existing records:", error);
        setCheckError("Network error while checking");
      } finally {
        setIsCheckingMembers(false);
        setIsCheckingPlayers(false);
      }
    };

    const timer = setTimeout(checkForExisting, 800);
    return () => clearTimeout(timer);
  }, [formData.firstName, formData.lastName]);

  // Link to selected member
  const handleLinkToMember = async (member: ExistingMember) => {
    console.log("🔗 Linking to member:", member.memberId, member.displayName);

    onChange("linkedMemberId", member.memberId);
    setLinkedMemberId(member.memberId);
    setSelectedMemberId(null);

    await autoFillFromMember(member);

    alert(
      `✅ Linked to member: ${member.displayName}\n🏢 Club: ${member.clubName}\n\nData has been auto-filled from their member record.`,
    );
  };

  // Unlink from member
  const handleUnlink = () => {
    if (confirm("Are you sure you want to unlink from the member record?")) {
      onChange("linkedMemberId", null);
      setLinkedMemberId(null);
      setAutoFillComplete(false);
      console.log("🔓 Unlinked from member");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (err) {
      return "Invalid Date";
    }
  };

  const goToMembership = () => {
    router.push("/membership");
  };

  const goToMemberProfile = (memberId: string) => {
    router.push(`/admin/members/${memberId}`);
  };

  const goToPlayerProfile = (playerId: string) => {
    router.push(`/admin/players/${playerId}/edit`);
  };

  const getSearchDescription = () => {
    if (searchMode === "both") {
      return `Searching by first AND last name: "${formData.firstName} ${formData.lastName}"`;
    } else if (searchMode === "first") {
      return `Searching by first name only: "${formData.firstName}"`;
    } else {
      return `Searching by last name only: "${formData.lastName}"`;
    }
  };

  return (
    <div className="space-y-6">
      {/* CRITICAL: Existing Player Warning */}
      {existingPlayers.length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="text-red-600 flex-shrink-0 mt-0.5"
              size={24}
            />
            <div className="flex-1">
              <h4 className="font-black text-red-900 text-base">
                🚨 DUPLICATE PLAYER WARNING
              </h4>
              <p className="text-sm text-red-800 mt-1 font-bold">
                This player already exists in the system! Found{" "}
                {existingPlayers.length} existing player
                {existingPlayers.length !== 1 ? "s" : ""} with this name.
              </p>

              <div className="mt-3 space-y-2">
                {existingPlayers.map((player) => (
                  <div
                    key={player.playerId}
                    className="p-3 bg-white border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-slate-900">
                          {player.firstName} {player.lastName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                          <span>DOB: {formatDate(player.dateOfBirth)}</span>
                          <span>Club: {player.clubName}</span>
                          <span
                            className={
                              player.active
                                ? "text-green-700 font-bold"
                                : "text-slate-500"
                            }
                          >
                            {player.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToPlayerProfile(player.playerId)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                      >
                        View Player
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-xs text-red-900 font-bold">
                  ⚠️ <strong>Action Required:</strong> Please edit the existing
                  player record instead of creating a duplicate. Click "View
                  Player" above to go to their record.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Linked Member Badge */}
      {linkedMemberId && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <LinkIcon className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-green-900">
                  ✅ Linked to Member Record{" "}
                  {autoFillComplete && "(Auto-filled)"}
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  Member ID: {linkedMemberId}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnlink}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1"
            >
              <X size={12} />
              Unlink
            </button>
          </div>
        </div>
      )}

      {/* Member Check Results */}
      {showMemberCheck && !linkedMemberId && existingPlayers.length === 0 && (
        <div>
          {isCheckingMembers || isCheckingPlayers ? (
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={20} />
              <div>
                <p className="text-sm font-bold text-blue-900">
                  Checking for existing members and players...
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {getSearchDescription()}
                </p>
              </div>
            </div>
          ) : checkError ? (
            <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-orange-600" size={20} />
              <div>
                <p className="text-sm font-bold text-orange-900">
                  {checkError}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Member check is optional - you can continue with registration
                </p>
              </div>
            </div>
          ) : similarMembers.length > 0 ? (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <UserCheck
                  className="text-yellow-600 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <h4 className="font-black text-yellow-900 text-sm">
                    ✅ Found {similarMembers.length} Existing Member
                    {similarMembers.length !== 1 ? "s" : ""}
                  </h4>
                  <p className="text-xs text-yellow-800 mt-1">
                    {getSearchDescription()}
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    {similarMembers.length > 1
                      ? "Select the correct member to link:"
                      : "This member will be linked and data auto-filled:"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {similarMembers.map((member) => {
                  const isSelected = selectedMemberId === member.memberId;

                  return (
                    <div
                      key={member.memberId}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-yellow-500 bg-yellow-100 shadow-lg"
                          : member.membershipStatus === "active"
                            ? "bg-green-50 border-green-200 hover:border-green-300"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setSelectedMemberId(member.memberId)}
                    >
                      <div className="flex items-start gap-3">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.displayName}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white shadow"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 border-2 border-white shadow">
                            <User size={32} className="text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <p className="font-black text-slate-900 text-base">
                              {member.displayName}
                            </p>
                            {member.membershipStatus === "active" && (
                              <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-black">
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              <strong>DOB:</strong>{" "}
                              {formatDate(member.dateOfBirth)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              <strong>Club:</strong> {member.clubName}
                            </span>
                            {member.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {member.email}
                              </span>
                            )}
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkToMember(member);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1"
                          >
                            <LinkIcon size={12} />
                            Link & Auto-Fill
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToMemberProfile(member.memberId);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                          >
                            View
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-xs text-yellow-900 font-bold">
                  ✨ <strong>Auto-Fill:</strong> Clicking "Link & Auto-Fill"
                  will automatically populate:
                </p>
                <ul className="text-xs text-yellow-800 mt-1 ml-4 list-disc space-y-1">
                  <li>Date of birth, email, phone number</li>
                  <li>Full address (street, suburb, city, state, postcode)</li>
                  <li>Club assignment & player photo</li>
                  <li>Links player to official member record</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <p className="text-sm font-bold text-green-900">
                  ✓ No existing members found
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {getSearchDescription()}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  New member - ensure they complete membership registration
                  first
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={(val) => onChange("firstName", val)}
          required
          placeholder="Lee"
          error={errors.firstName}
          icon={User}
        />

        <FormField
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={(val) => onChange("lastName", val)}
          required
          placeholder="Aitchison"
          error={errors.lastName}
          icon={User}
        />

        <FormField
          label="Preferred Name"
          name="preferredName"
          value={formData.preferredName}
          onChange={(val) => onChange("preferredName", val)}
          placeholder="Optional"
          hint="What they like to be called"
          error={errors.preferredName}
        />
      </div>

      {/* Date of Birth */}
      <div>
        <FormField
          label="Date of Birth"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={(val) => onChange("dateOfBirth", val)}
          type="date"
          required
          error={errors.dateOfBirth}
          icon={Calendar}
        />
        {age !== null && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                playerIsMinor
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              Age: {age} {playerIsMinor ? "(Minor)" : "(Adult)"}
            </span>
          </div>
        )}
      </div>

      {/* Gender - Type-ahead from Config */}
      <div className="relative">
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Gender <span className="text-red-500">*</span>
          <span className="text-slate-400 font-normal ml-2 normal-case">
            (Type to search)
          </span>
        </label>
        {loadingGenders ? (
          <div className="flex items-center gap-2 px-5 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl">
            <Loader2 size={16} className="animate-spin text-slate-400" />
            <span className="text-sm text-slate-500 font-bold">
              Loading genders...
            </span>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={genderSearch}
              onChange={(e) => {
                const value = e.target.value;
                setGenderSearch(value);
                onChange("gender", value);
              }}
              placeholder="Type to search (e.g., Male, Female, Non-binary)..."
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            />
            {genderSearch && getFilteredGenders(genderSearch).length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                {getFilteredGenders(genderSearch).map((gender) => (
                  <button
                    key={gender.id}
                    type="button"
                    onClick={() => {
                      onChange("gender", gender.name);
                      setGenderSearch(gender.name);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <span className="font-bold text-slate-900">
                        {gender.name}
                      </span>
                      {gender.description && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {gender.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-400 ml-2">
                      {gender.code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {errors.gender && (
          <p className="text-xs text-red-600 mt-1 ml-1">{errors.gender}</p>
        )}
      </div>

      {/* Contact Information */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4">
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Email"
            name="email"
            value={formData.email}
            onChange={(val) => onChange("email", val)}
            type="email"
            placeholder="player@email.com"
            error={errors.email}
            icon={Mail}
          />

          <FormField
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={(val) => onChange("phone", val)}
            type="tel"
            placeholder="0400 000 000"
            error={errors.phone}
            icon={Phone}
          />
        </div>
      </div>

      {/* Address */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
          <MapPin size={16} />
          Address
        </h3>

        <div className="space-y-4">
          <FormField
            label="Street Address"
            name="street"
            value={formData.street}
            onChange={(val) => onChange("street", val)}
            required
            placeholder="123 Hockey Drive"
            error={errors.street}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Suburb"
              name="suburb"
              value={formData.suburb}
              onChange={(val) => onChange("suburb", val)}
              required
              placeholder="Suburb"
              error={errors.suburb}
            />

            <FormField
              label="City"
              name="city"
              value={formData.city}
              onChange={(val) => onChange("city", val)}
              placeholder="City"
              error={errors.city}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="State"
              name="state"
              value={formData.state}
              onChange={(val) => onChange("state", val)}
              placeholder="QLD"
              error={errors.state}
            />

            <FormField
              label="Postcode"
              name="postcode"
              value={formData.postcode}
              onChange={(val) => onChange("postcode", val)}
              required
              placeholder="4000"
              error={errors.postcode}
            />

            <FormField
              label="Country"
              name="country"
              value={formData.country}
              onChange={(val) => onChange("country", val)}
              placeholder="Australia"
              error={errors.country}
            />
          </div>
        </div>
      </div>

      {/* Membership Warning */}
      {!similarMembers.some((m) => m.membershipStatus === "active") &&
        !linkedMemberId &&
        showMemberCheck &&
        !isCheckingMembers &&
        !isCheckingPlayers &&
        !checkError &&
        existingPlayers.length === 0 &&
        (formData.firstName.trim().length >= 2 ||
          formData.lastName.trim().length >= 2) && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="text-blue-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div className="flex-1">
                <h4 className="font-black text-blue-900 text-sm">
                  New Member Registration Required
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  No active member found. They must complete membership
                  registration before being added as a player.
                </p>
                <button
                  type="button"
                  onClick={goToMembership}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                  Go to Membership Registration
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
