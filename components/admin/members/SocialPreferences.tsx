"use client";
// Editable social links and contact preferences, each with a Public / Private switch.
// Stored on the member as socialMedia, communicationPreferences and privacy (true = public).

import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "linkedin",
  "website",
] as const;
const METHODS = ["Email", "SMS", "Phone", "Push notification"].map((v) => ({
  value: v,
  label: v,
}));
const FREQUENCIES = ["Immediately", "Daily", "Weekly", "Monthly", "Never"].map(
  (v) => ({ value: v, label: v }),
);

const INPUT =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const LABEL = "text-xs font-black uppercase text-slate-400";
const label = (k: string) =>
  k === "twitter" ? "X (Twitter)" : k.charAt(0).toUpperCase() + k.slice(1);

/** The saved record can hold social links as an object and/or as a list; show both. */
export function mergedSocial(member: any): Record<string, string> {
  const fromList = Object.fromEntries(
    (Array.isArray(member.personalInfo?.socialMedia)
      ? member.personalInfo.socialMedia
      : []
    )
      .map((s: any) => [
        String(s.platform || s.type || "").toLowerCase(),
        s.handle || s.url || "",
      ])
      .filter(([k]: [string, string]) => k),
  );
  return { ...fromList, ...(member.socialMedia || {}) };
}

function PublicSwitch({
  on,
  onChange,
  name,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${name}: ${on ? "public" : "private"}`}
      onClick={() => onChange(!on)}
      className={`flex shrink-0 items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-black uppercase transition-colors ${
        on
          ? "border-green-500 bg-green-50 text-green-700"
          : "border-slate-300 bg-slate-50 text-slate-500"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${on ? "bg-green-500" : "bg-slate-400"}`}
      />
      {on ? "Public" : "Private"}
    </button>
  );
}

export interface SocialValue {
  socialMedia: Record<string, string>;
  communicationPreferences: Record<string, any>;
  privacy: {
    socialMedia?: Record<string, boolean>;
    communicationPreferences?: Record<string, boolean>;
  };
}

export default function SocialPreferences({
  value,
  onChange,
}: {
  value: SocialValue;
  onChange: (next: SocialValue) => void;
}) {
  const social = value.socialMedia || {};
  const comm = value.communicationPreferences || {};
  const priv = value.privacy || {};
  const isPublic = (
    group: "socialMedia" | "communicationPreferences",
    key: string,
  ) => priv[group]?.[key] === true;

  const setSocial = (k: string, v: string) =>
    onChange({ ...value, socialMedia: { ...social, [k]: v } });
  const setComm = (k: string, v: unknown) =>
    onChange({ ...value, communicationPreferences: { ...comm, [k]: v } });
  const setPublic = (
    group: "socialMedia" | "communicationPreferences",
    k: string,
    v: boolean,
  ) =>
    onChange({
      ...value,
      privacy: { ...priv, [group]: { ...(priv[group] || {}), [k]: v } },
    });

  const row = (
    group: "socialMedia" | "communicationPreferences",
    key: string,
    name: string,
    control: React.ReactNode,
  ) => (
    <div key={`${group}.${key}`} className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <label className={`${LABEL} mb-1 block`}>{name}</label>
        {control}
      </div>
      <PublicSwitch
        name={name}
        on={isPublic(group, key)}
        onChange={(v) => setPublic(group, key, v)}
      />
    </div>
  );

  const platforms = [...new Set([...SOCIAL_PLATFORMS, ...Object.keys(social)])];
  const yesNo = (k: string, name: string) =>
    row(
      "communicationPreferences",
      k,
      name,
      <TypeaheadSelect
        ariaLabel={name}
        placeholder="Select…"
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        value={comm[k] === undefined ? "" : comm[k] ? "yes" : "no"}
        onChange={(v) => setComm(k, v === "" ? undefined : v === "yes")}
      />,
    );

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Switch an item to <b>Public</b> to allow it to be shown publicly.
        Everything defaults to <b>Private</b>.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {platforms.map((k) =>
          row(
            "socialMedia",
            k,
            label(k),
            <input
              className={INPUT}
              aria-label={label(k)}
              value={social[k] ?? ""}
              placeholder={k === "website" ? "https://…" : "@handle or link"}
              onChange={(e) => setSocial(k, e.target.value)}
            />,
          ),
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
        {row(
          "communicationPreferences",
          "preferredMethod",
          "Preferred contact",
          <TypeaheadSelect
            ariaLabel="Preferred contact"
            placeholder="Select…"
            options={METHODS}
            value={comm.preferredMethod || ""}
            onChange={(v) => setComm("preferredMethod", v)}
          />,
        )}
        {row(
          "communicationPreferences",
          "emailFrequency",
          "Email frequency",
          <TypeaheadSelect
            ariaLabel="Email frequency"
            placeholder="Select…"
            options={FREQUENCIES}
            value={comm.emailFrequency || ""}
            onChange={(v) => setComm("emailFrequency", v)}
          />,
        )}
        {yesNo("smsNotifications", "SMS notifications")}
        {yesNo("pushNotifications", "Push notifications")}
      </div>
    </div>
  );
}
