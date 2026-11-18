// lib/surveys/validate.ts
// Cleaning what the builder sends, and what a respondent sends back. Pure.

import {
  AUDIENCE_GROUPS, LEVELS, PURPOSES, QUESTION_TYPES, SUBJECT_TYPES,
  type AudienceGroup, type SurveyAnswer, type SurveyInput, type SurveyQuestion, type SurveyAudience, type SurveySubject, type SurveyDelivery,
} from "@/lib/surveys/types";

export type Cleaned<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isoOrNull = (v: unknown) => {
  const t = Date.parse(String(v ?? ""));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
const day = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined;
};

export function cleanQuestions(raw: unknown): Cleaned<SurveyQuestion[]> {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "Add at least one question" };
  if (raw.length > 40) return { ok: false, error: "A survey can have up to 40 questions" };
  const out: SurveyQuestion[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const q = (raw[i] ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const type = QUESTION_TYPES.find((t) => t === q.type);
    if (!type) return { ok: false, error: `Question ${n}: choose a type` };
    const text = str(q.text, 300);
    if (!text) return { ok: false, error: `Question ${n}: write the question` };
    let id = str(q.id, 40).replace(/[^A-Za-z0-9_-]/g, "") || `q${n}`;
    while (ids.has(id)) id = `${id}x`;
    ids.add(id);
    const question: SurveyQuestion = { id, type, text, required: q.required !== false };
    const help = str(q.help, 300);
    if (help) question.help = help;
    if (type === "single" || type === "multi" || type === "ranking") {
      const seen = new Set<string>();
      const options = (Array.isArray(q.options) ? q.options : [])
        .map((o, j) => {
          const label = str((o as any)?.label ?? o, 120);
          let oid = str((o as any)?.id, 40).replace(/[^A-Za-z0-9_-]/g, "") || `o${j + 1}`;
          while (seen.has(oid)) oid = `${oid}x`;
          seen.add(oid);
          return { id: oid, label };
        })
        .filter((o) => o.label);
      if (options.length < 2) return { ok: false, error: `Question ${n}: give at least two choices` };
      if (options.length > 20) return { ok: false, error: `Question ${n}: up to 20 choices` };
      question.options = options;
      if (type !== "ranking" && q.allowOther === true) question.allowOther = true;
    }
    if (type === "rating" || type === "scale10") {
      const lo = str(q.lowLabel, 60), hi = str(q.highLabel, 60);
      if (lo) question.lowLabel = lo;
      if (hi) question.highLabel = hi;
    }
    out.push(question);
  }
  return { ok: true, value: out };
}

export function cleanAudience(raw: unknown): SurveyAudience {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const age = Number(r.maxAge);
  const p = (r.participantsOf && typeof r.participantsOf === "object" ? r.participantsOf : null) as Record<string, unknown> | null;
  const pType = p?.type === "competition" || p?.type === "tournament" ? p.type : null;
  const pId = str(p?.id, 80);
  return {
    teamIds: [...new Set((Array.isArray(r.teamIds) ? r.teamIds : []).map((x) => str(x, 80)).filter(Boolean))].slice(0, 30),
    maxAge: r.maxAge === null || r.maxAge === undefined || r.maxAge === "" || !Number.isFinite(age) || age < 4 || age > 99 ? null : Math.floor(age),
    includeGuardians: r.includeGuardians !== false,
    groups: [...new Set((Array.isArray(r.groups) ? r.groups : []).filter((g): g is AudienceGroup => (AUDIENCE_GROUPS as readonly unknown[]).includes(g)))],
    participantsOf: pType && pId ? { type: pType, id: pId } : null,
  };
}

function cleanSubject(raw: unknown): SurveySubject {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const type = SUBJECT_TYPES.find((t) => t === r.type) ?? "none";
  const s: SurveySubject = { type, label: str(r.label, 160) };
  const id = str(r.id, 80);
  if (id) s.id = id;
  const sd = day(r.startDate), ed = day(r.endDate);
  if (sd) s.startDate = sd;
  if (ed) s.endDate = ed;
  const loc = str(r.location, 120);
  if (loc) s.location = loc;
  return s;
}

function cleanDelivery(raw: unknown): SurveyDelivery {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = { inApp: r.inApp !== false, popup: r.popup === true, email: r.email === true };
  // A pop-up and an inbox entry both live in the app: at least one way in is always on.
  if (!d.inApp && !d.popup && !d.email) d.inApp = true;
  return d;
}

export function cleanSurvey(body: unknown, now: Date = new Date()): Cleaned<SurveyInput> {
  const b = (body && typeof body === "object" ? body : null) as Record<string, unknown> | null;
  if (!b) return { ok: false, error: "Nothing to save" };
  const title = str(b.title, 140);
  if (!title) return { ok: false, error: "Give the survey a title" };
  const level = LEVELS.find((l) => l === b.level);
  if (!level) return { ok: false, error: "Choose who it's for" };
  const scopeId = level === "global" ? "" : str(b.scopeId, 80);
  if (level !== "global" && !scopeId) return { ok: false, error: "Choose which association, club or team" };
  const q = cleanQuestions(b.questions);
  if (!q.ok) return q;

  const opensAt = isoOrNull(b.opensAt) ?? now.toISOString();
  const closesAt = isoOrNull(b.closesAt);
  if (!closesAt) return { ok: false, error: "Choose when it closes" };
  if (Date.parse(closesAt) <= Date.parse(opensAt)) return { ok: false, error: "It has to close after it opens" };

  const purpose = PURPOSES.find((p) => p === b.purpose) ?? "general";
  const subject = cleanSubject(b.subject);
  if ((purpose === "competition" || purpose === "event" || purpose === "topic") && !subject.label) {
    return { ok: false, error: purpose === "topic" ? "Say what the topic is" : purpose === "competition" ? "Choose the competition" : "Name the event" };
  }
  const days = Number(b.remindDaysBefore);
  return {
    ok: true,
    value: {
      title,
      intro: str(b.intro, 1500),
      thanks: str(b.thanks, 500),
      purpose,
      subject,
      level,
      scopeId,
      includeBelow: level === "association" && b.includeBelow !== false,
      audience: cleanAudience(b.audience),
      questions: q.value,
      delivery: cleanDelivery(b.delivery),
      anonymous: b.anonymous === true,
      opensAt,
      closesAt,
      remindDaysBefore: b.remindDaysBefore === null || b.remindDaysBefore === "" || b.remindDaysBefore === undefined || !Number.isFinite(days) || days < 1 || days > 30 ? null : Math.floor(days),
    },
  };
}

/** A respondent's answers checked against the survey's questions. Unknown questions and options are rejected. */
export function cleanAnswers(questions: SurveyQuestion[], raw: unknown): Cleaned<SurveyAnswer[]> {
  const given = new Map<string, Record<string, unknown>>();
  for (const a of Array.isArray(raw) ? raw : []) {
    const r = (a ?? {}) as Record<string, unknown>;
    if (typeof r.questionId === "string") given.set(r.questionId, r);
  }
  for (const id of given.keys()) if (!questions.some((q) => q.id === id)) return { ok: false, error: "That answer doesn't match a question" };

  const out: SurveyAnswer[] = [];
  for (const q of questions) {
    const a = given.get(q.id);
    const v = a?.value;
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    const other = q.allowOther ? str(a?.other, 300) : "";
    if (empty && !other) {
      if (q.required) return { ok: false, error: `Please answer: ${q.text}` };
      continue;
    }
    const optionIds = new Set((q.options ?? []).map((o) => o.id));
    switch (q.type) {
      case "single": {
        if (empty) { out.push({ questionId: q.id, value: null, other }); break; }
        if (typeof v !== "string" || !optionIds.has(v)) return { ok: false, error: `Choose one of the options for: ${q.text}` };
        out.push({ questionId: q.id, value: v, ...(other ? { other } : {}) });
        break;
      }
      case "multi": {
        const list = Array.isArray(v) ? v : [];
        if (!list.every((x) => typeof x === "string" && optionIds.has(x))) return { ok: false, error: `Choose from the options for: ${q.text}` };
        out.push({ questionId: q.id, value: [...new Set(list as string[])], ...(other ? { other } : {}) });
        break;
      }
      case "yes_no": {
        if (v !== "yes" && v !== "no") return { ok: false, error: `Answer yes or no: ${q.text}` };
        out.push({ questionId: q.id, value: v });
        break;
      }
      case "rating":
      case "scale10": {
        const n = Number(v);
        const [lo, hi] = q.type === "rating" ? [1, 5] : [0, 10];
        if (!Number.isInteger(n) || n < lo || n > hi) return { ok: false, error: `Pick a score from ${lo} to ${hi}: ${q.text}` };
        out.push({ questionId: q.id, value: n });
        break;
      }
      case "ranking": {
        const list = Array.isArray(v) ? (v as unknown[]) : [];
        const ids = list.filter((x): x is string => typeof x === "string" && optionIds.has(x));
        if (ids.length !== list.length || new Set(ids).size !== ids.length) return { ok: false, error: `Put the choices in order: ${q.text}` };
        if (q.required && ids.length !== optionIds.size) return { ok: false, error: `Rank every choice: ${q.text}` };
        out.push({ questionId: q.id, value: ids });
        break;
      }
      case "text": {
        out.push({ questionId: q.id, value: str(v, 2000) });
        break;
      }
    }
  }
  return { ok: true, value: out };
}
