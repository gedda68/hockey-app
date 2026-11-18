// lib/surveys/aggregate.ts
// Turning responses into results. Pure. Anonymous surveys hold everything back until enough people have answered,
// so a handful of answers can't be traced to a person.

import { MIN_ANONYMOUS_RESPONSES, type SurveyAnswer, type SurveyQuestion } from "@/lib/surveys/types";

export interface ResponseLike { answers: SurveyAnswer[]; memberId?: string; memberName?: string; submittedAt?: string; team?: string }

export interface ChoiceResult { id: string; label: string; count: number; percent: number }
export interface QuestionResult {
  questionId: string;
  text: string;
  type: SurveyQuestion["type"];
  answered: number;
  choices?: ChoiceResult[];
  otherAnswers?: string[];
  average?: number;
  distribution?: { value: number; count: number }[];
  /** scale10 only: promoters (9–10) minus detractors (0–6), as a whole number from -100 to 100. */
  nps?: number;
  /** ranking: average position (1 = top priority) and how many put it first. */
  ranking?: { id: string; label: string; averagePosition: number; firstChoices: number }[];
  texts?: string[];
}

export interface SurveyResults {
  responses: number;
  invited: number;
  responseRate: number | null;
  /** False while an anonymous survey has fewer answers than the threshold. */
  visible: boolean;
  needed: number;
  questions: QuestionResult[];
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function aggregate(questions: SurveyQuestion[], responses: ResponseLike[], opts: { anonymous: boolean; invited: number }): SurveyResults {
  const n = responses.length;
  const hidden = opts.anonymous && n < MIN_ANONYMOUS_RESPONSES;
  const base = {
    responses: n,
    invited: opts.invited,
    responseRate: opts.invited > 0 ? round((n / opts.invited) * 100, 0) : null,
    visible: !hidden,
    needed: hidden ? MIN_ANONYMOUS_RESPONSES - n : 0,
  };
  if (hidden) return { ...base, questions: [] };

  const results: QuestionResult[] = questions.map((q) => {
    const answers = responses.map((r) => r.answers.find((a) => a.questionId === q.id)).filter((a): a is SurveyAnswer => !!a);
    const given = answers.filter((a) => a.value !== null && a.value !== "" && !(Array.isArray(a.value) && a.value.length === 0));
    const r: QuestionResult = { questionId: q.id, text: q.text, type: q.type, answered: given.length + answers.filter((a) => a.other && (a.value === null || (Array.isArray(a.value) && a.value.length === 0))).length };

    if (q.type === "single" || q.type === "multi" || q.type === "yes_no") {
      const opts = q.type === "yes_no" ? [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] : q.options ?? [];
      const counts = new Map<string, number>(opts.map((o) => [o.id, 0]));
      for (const a of given) for (const v of Array.isArray(a.value) ? a.value : [a.value]) if (typeof v === "string" && counts.has(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
      const denom = r.answered || 1;
      r.choices = opts.map((o) => ({ id: o.id, label: o.label, count: counts.get(o.id) ?? 0, percent: round(((counts.get(o.id) ?? 0) / denom) * 100, 0) }));
      const others = answers.map((a) => a.other?.trim()).filter((x): x is string => !!x);
      if (others.length) r.otherAnswers = others;
    } else if (q.type === "rating" || q.type === "scale10") {
      const nums = given.map((a) => Number(a.value)).filter((x) => Number.isFinite(x));
      const [lo, hi] = q.type === "rating" ? [1, 5] : [0, 10];
      r.average = nums.length ? round(nums.reduce((s, x) => s + x, 0) / nums.length, 1) : undefined;
      r.distribution = Array.from({ length: hi - lo + 1 }, (_, i) => ({ value: lo + i, count: nums.filter((x) => x === lo + i).length }));
      if (q.type === "scale10" && nums.length) {
        const promoters = nums.filter((x) => x >= 9).length, detractors = nums.filter((x) => x <= 6).length;
        r.nps = Math.round(((promoters - detractors) / nums.length) * 100);
      }
    } else if (q.type === "ranking") {
      const opts = q.options ?? [];
      const rows = opts.map((o) => {
        const positions = given.map((a) => (Array.isArray(a.value) ? a.value.indexOf(o.id) : -1)).filter((p) => p >= 0).map((p) => p + 1);
        return { id: o.id, label: o.label, averagePosition: positions.length ? round(positions.reduce((s, x) => s + x, 0) / positions.length, 1) : 0, firstChoices: positions.filter((p) => p === 1).length, ranked: positions.length };
      });
      r.ranking = rows
        .sort((a, b) => (a.ranked === 0 ? 1 : b.ranked === 0 ? -1 : a.averagePosition - b.averagePosition))
        .map(({ ranked: _r, ...rest }) => rest);
    } else if (q.type === "text") {
      r.texts = given.map((a) => String(a.value)).filter(Boolean);
    }
    return r;
  });
  return { ...base, questions: results };
}

const csvCell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
  // A leading = + - @ would run as a formula when opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** One row per response. Anonymous surveys carry no names (and no timestamps finer than a day, so order can't identify anyone). */
export function toCsv(questions: SurveyQuestion[], responses: ResponseLike[], anonymous: boolean): string {
  const label = (q: SurveyQuestion, v: unknown): unknown => {
    if (q.options) {
      const name = (id: unknown) => q.options!.find((o) => o.id === id)?.label ?? id;
      return Array.isArray(v) ? v.map(name) : name(v);
    }
    return v;
  };
  const head = [...(anonymous ? [] : ["Member", "Member ID"]), "Submitted", ...questions.map((q) => q.text)];
  const rows = responses.map((r) => [
    ...(anonymous ? [] : [r.memberName ?? "", r.memberId ?? ""]),
    r.submittedAt ? (anonymous ? r.submittedAt.slice(0, 10) : r.submittedAt) : "",
    ...questions.map((q) => {
      const a = r.answers.find((x) => x.questionId === q.id);
      if (!a) return "";
      const v = label(q, a.value);
      return a.other ? [...(Array.isArray(v) ? v : v ? [v] : []), `Other: ${a.other}`] : v;
    }),
  ]);
  const shuffled = anonymous ? [...rows].sort((a, b) => String(a.join()).localeCompare(String(b.join()))) : rows;
  return [head, ...shuffled].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
