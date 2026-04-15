// sections/IdentitySection.tsx
// Identity: name, code, level, parent association

import FormField from "../shared/FormField";
import { IdentitySectionProps } from "../types/association.types";
import { LEVEL_MAP } from "../AssociationsList";

function levelFromParent(
  parentAssociationId: string,
  parentAssociations: { associationId: string; level: number }[],
): number {
  const pid = parentAssociationId?.trim();
  if (!pid) return 0;
  const parent = parentAssociations.find((p) => p.associationId === pid);
  return typeof parent?.level === "number" ? parent.level + 1 : 0;
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
  const validParents = parentAssociations.filter(
    (p) => p.associationId !== formData.associationId,
  );

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
          Level (derived)
        </label>
        <div className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
          {LEVEL_MAP[Number(selectedLevel)]?.short ?? `L${Number(selectedLevel)}`} —{" "}
          {LEVEL_MAP[Number(selectedLevel)]?.label ??
            `Level ${Number(selectedLevel)}`}
        </div>
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
          Derived from parent (root = L0, child = parent + 1). To change the level, change the
          parent association.
        </p>
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Parent Association
        </label>
        <select
          value={formData.parentAssociationId}
          onChange={(e) => {
            const pid = e.target.value;
            onChange("parentAssociationId", pid);
            onLevelChange(levelFromParent(pid, parentAssociations) as number | "");
          }}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
        >
          <option value="">None (root / National)</option>
          {validParents.map((a) => (
            <option key={a.associationId} value={a.associationId}>
              {a.code} – {a.name} ({LEVEL_MAP[a.level]?.short ?? `L${a.level}`} ·{" "}
              {LEVEL_MAP[a.level]?.label ?? `Level ${a.level}`})
            </option>
          ))}
        </select>
      </div>

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
