// lib/members/demographics.ts
// Optional demographic details collected at registration: Aboriginal and Torres Strait Islander status
// and nationality. Both are voluntary, and used only as aggregate figures for planning and funding reports.

/** Wording follows the Australian Bureau of Statistics standard question. */
export const INDIGENOUS_OPTIONS = [
  { value: "no", label: "No" },
  { value: "aboriginal", label: "Yes, Aboriginal" },
  { value: "torres-strait-islander", label: "Yes, Torres Strait Islander" },
  { value: "both", label: "Yes, both Aboriginal and Torres Strait Islander" },
  { value: "not-stated", label: "Prefer not to say" },
] as const;
export type IndigenousStatus = (typeof INDIGENOUS_OPTIONS)[number]["value"];

export const isIndigenous = (v: unknown) => v === "aboriginal" || v === "torres-strait-islander" || v === "both";

export const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Republic of the)","Congo (Democratic Republic of the)","Costa Rica","Côte d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Türkiye","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<string, string> = { usa: "United States", us: "United States", uk: "United Kingdom", england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom", turkey: "Türkiye", holland: "Netherlands", ivorycoast: "Côte d'Ivoire", burma: "Myanmar", czechrepublic: "Czechia", swaziland: "Eswatini", easttimor: "Timor-Leste" };

/** A typed or pasted name matched to the list ("new zealand", "USA"), or null when it isn't a country we know. */
export function matchCountry(raw: unknown): string | null {
  const k = key(String(raw ?? ""));
  if (!k) return null;
  return COUNTRIES.find((c) => key(c) === k) ?? ALIASES[k] ?? null;
}

export interface Demographics { indigenousStatus?: IndigenousStatus; nationality?: string }

/** What the form sent, made safe. Anything unrecognised is dropped, so an old value is never overwritten with junk. */
export function cleanDemographics(raw: unknown): Demographics {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Demographics = {};
  const st = INDIGENOUS_OPTIONS.find((o) => o.value === r.indigenousStatus);
  if (st) out.indigenousStatus = st.value;
  const nat = matchCountry(r.nationality);
  if (nat) out.nationality = nat;
  return out;
}
