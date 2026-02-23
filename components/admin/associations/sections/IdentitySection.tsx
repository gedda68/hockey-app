// sections/IdentitySection.tsx
// Identity: name, code, level, parent association

import FormField from "../shared/FormField";
import { IdentitySectionProps } from "../types/association.types";
import { LEVEL_MAP } from "../AssociationsList";

// Allowed parent levels for each level
function allowedParentLevels(selectedLevel: number): number[] {
  const map: Record<number, number[]> = {
    0: [], // National: no parent
    1: [0], // Sub-national: parent must be National (0)
    2: [0, 1], // State: parent can be National (0) or Sub-national (1)
    3: [1, 2], // Regional: parent can be Sub-national (1) or State (2)
    4: [2, 3], // City: parent can be State (2) or Regional (3)
  };
  return map[selectedLevel] ?? [];
}

export default function IdentitySection({
  formData,
  onChange,
  errors,
  selectedLevel,
  onLevelChange,
  parentAssociations,
  isEdit,
}: IdentitySectionProps) {
  const validParents = selectedLevel
    ? parentAssociations.filter((p) =>
        allowedParentLevels(selectedLevel as number).includes(p.level),
      )
    : parentAssociations;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Association ID"
          name="associationId"
          value={formData.associationId}
          onChange={(val) => onChange("associationId", val)}
          required
          disabled={isEdit}
          placeholder="e.g. bha"
          hint={
            isEdit
              ? "Cannot be changed after creation"
              : "Unique identifier, lowercase"
          }
          error={errors.associationId}
        />
        <FormField
          label="Code"
          name="code"
          value={formData.code}
          onChange={(val) => onChange("code", val)}
          required
          placeholder="e.g. BHA"
          hint="Short uppercase code"
          error={errors.code}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Display Name"
          name="name"
          value={formData.name}
          onChange={(val) => onChange("name", val)}
          required
          placeholder="Brisbane Hockey Association"
          error={errors.name}
        />
        <FormField
          label="Full Legal Name"
          name="fullName"
          value={formData.fullName}
          onChange={(val) => onChange("fullName", val)}
          required
          placeholder="Brisbane Hockey Association Inc."
          error={errors.fullName}
        />
      </div>

      <FormField
        label="Acronym"
        name="acronym"
        value={formData.acronym}
        onChange={(val) => onChange("acronym", val)}
        placeholder="Optional short acronym"
        error={errors.acronym}
      />

      {/* Level Dropdown */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Level <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedLevel}
          onChange={(e) => {
            const val = e.target.value === "" ? "" : parseInt(e.target.value);
            console.log("📊 LEVEL CHANGED:", {
              from: selectedLevel,
              to: val,
              type: typeof val,
            });
            onLevelChange(val as number | "");
            // Reset parent when level changes
            onChange("parentAssociationId", "");
          }}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
        >
          <option value="">Select level…</option>
          <option value="0">Level 0 – National</option>
          <option value="1">Level 1 – Sub-national</option>
          <option value="2">Level 2 – State</option>
          <option value="3">Level 3 – Regional</option>
          <option value="4">Level 4 – City</option>
        </select>
        {selectedLevel !== "" && (
          <p className="text-xs text-slate-500 font-bold mt-1 ml-1">
            {LEVEL_MAP[selectedLevel as number]?.label}
          </p>
        )}
      </div>

      {/* Parent Association Dropdown - only for levels > 0 */}
      {selectedLevel !== "" && (selectedLevel as number) > 0 && (
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Parent Association
          </label>
          {validParents.length === 0 ? (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
              <p className="text-sm font-bold text-yellow-700">
                No valid parent associations found for Level {selectedLevel}.
                Valid parents are:{" "}
                {allowedParentLevels(selectedLevel as number)
                  .map((l) => LEVEL_MAP[l]?.label)
                  .join(" or ")}
              </p>
            </div>
          ) : (
            <select
              value={formData.parentAssociationId}
              onChange={(e) => onChange("parentAssociationId", e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              <option value="">None</option>
              {validParents.map((a) => (
                <option key={a.associationId} value={a.associationId}>
                  {a.code} – {a.name} (
                  {LEVEL_MAP[a.level]?.label || `L${a.level}`})
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
            Allowed parent levels:{" "}
            {allowedParentLevels(selectedLevel as number)
              .map((l) => LEVEL_MAP[l]?.label)
              .join(", ")}
          </p>
        </div>
      )}

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => onChange("status", e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
    </div>
  );
}
