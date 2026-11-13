"use client";
// Blue Card (Queensland Working with Children check): everything needed to record and verify a member's card.
// Saved on the member as `blueCard`.

import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import {
  CARD_CATEGORIES,
  CARD_STATUSES,
  CARD_TYPES,
  ISSUING_STATES,
  blueCardStatus,
  type BlueCardState,
} from "@/lib/members/blueCard";

const INPUT =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const LABEL = "text-xs font-black uppercase text-slate-400 mb-1 block";
const opts = (list: readonly string[]) =>
  list.map((v) => ({ value: v, label: v }));

export const STATE_STYLE: Record<BlueCardState, string> = {
  valid: "border-green-300 bg-green-50 text-green-800",
  expiring: "border-amber-300 bg-amber-50 text-amber-800",
  expired: "border-red-300 bg-red-50 text-red-800",
  blocked: "border-red-300 bg-red-50 text-red-800",
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  missing: "border-red-300 bg-red-50 text-red-800",
  exempt: "border-slate-300 bg-slate-50 text-slate-700",
};

export function BlueCardBanner({
  card,
  required,
}: {
  card: Record<string, any> | undefined;
  required: boolean;
}) {
  const s = blueCardStatus(card);
  const needs = required && !s.ok;
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 text-sm font-bold ${STATE_STYLE[s.state]}`}
      role="status"
    >
      {s.label}
      {needs && " — a valid blue card is required for this member's role(s)."}
      {!required && s.state === "missing" && " (not currently required)"}
    </div>
  );
}

export default function BlueCardSection({
  value,
  onChange,
  required,
  roleNames,
}: {
  value: Record<string, any> | undefined;
  onChange: (next: Record<string, any>) => void;
  required: boolean;
  roleNames?: string[];
}) {
  const bc = value || {};
  const set = (patch: Record<string, any>) => onChange({ ...bc, ...patch });
  const field = (
    key: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        className={INPUT}
        aria-label={label}
        value={bc[key] ?? ""}
        onChange={(e) => set({ [key]: e.target.value })}
        {...props}
      />
    </div>
  );
  const pick = (
    key: string,
    label: string,
    list: readonly string[],
    placeholder = "Select…",
  ) => (
    <div>
      <label className={LABEL}>{label}</label>
      <TypeaheadSelect
        ariaLabel={label}
        placeholder={placeholder}
        options={opts(list)}
        value={bc[key] ?? ""}
        onChange={(v) => set({ [key]: v })}
      />
    </div>
  );
  const check = (key: string, label: string) => (
    <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-slate-300"
        checked={!!bc[key]}
        onChange={(e) => set({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-6">
      <BlueCardBanner card={bc} required={required} />
      {required && (
        <p className="text-sm text-slate-500">
          Required because this member is over 15 and holds
          {roleNames?.length
            ? ` ${roleNames.join(", ")}`
            : " a role other than player"}
          .
        </p>
      )}

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        {check("exempt", "Exempt from holding a blue card")}
        {bc.exempt &&
          field("exemptReason", "Reason for exemption", {
            placeholder: "e.g. parent of a participant, volunteer under 18",
          })}
      </div>

      {!bc.exempt && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {pick("cardType", "Card type", CARD_TYPES)}
            {pick("category", "Card category", CARD_CATEGORIES)}
            {pick("status", "Card status", CARD_STATUSES)}
            {field("cardNumber", "Card number", {
              placeholder: "Number shown on the card",
            })}
            {field("nameOnCard", "Name on card", {
              placeholder: "If different from member name",
            })}
            {pick(
              "issuingState",
              "Issuing state / territory",
              ISSUING_STATES,
              "QLD",
            )}
            {field("issueDate", "Issue date", { type: "date" })}
            {field("expiryDate", "Expiry date", { type: "date" })}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <h4 className="text-xs font-black uppercase text-slate-400">
              Organisation link and verification
            </h4>
            {check(
              "linkedToClub",
              "Card holder is linked to our club in the Blue Card system",
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {bc.linkedToClub &&
                field("linkedDate", "Date linked", { type: "date" })}
              {field("lastVerifiedDate", "Last verified", { type: "date" })}
              {field("verifiedBy", "Verified by", {
                placeholder: "Name of person who checked",
              })}
            </div>
          </div>
        </>
      )}

      <div>
        <label className={LABEL}>Notes</label>
        <textarea
          className={INPUT}
          rows={3}
          aria-label="Blue card notes"
          value={bc.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
