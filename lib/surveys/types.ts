// lib/surveys/types.ts
// Surveys: who is asked (an audience at any level, from one team up to everyone), what about (a competition, an
// event or tournament, how the club or association is doing, or any topic) and how (in-app, pop-up, email).

export const QUESTION_TYPES = ["single", "multi", "yes_no", "rating", "scale10", "ranking", "text"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Pick one",
  multi: "Pick any that apply",
  yes_no: "Yes / No",
  rating: "Star rating (1–5)",
  scale10: "Score out of 10 (0–10)",
  ranking: "Put in order of priority",
  text: "Written answer",
};

export interface SurveyOption { id: string; label: string }

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  help?: string;
  required: boolean;
  /** single / multi / ranking */
  options?: SurveyOption[];
  /** Offer an "Other (please say)" box on single / multi. */
  allowOther?: boolean;
  /** Scale labels for rating / scale10, e.g. "Not at all likely" … "Extremely likely". */
  lowLabel?: string;
  highLabel?: string;
}

export const PURPOSES = ["general", "competition", "event", "club_performance", "association_performance", "topic"] as const;
export type Purpose = (typeof PURPOSES)[number];
export const PURPOSE_LABELS: Record<Purpose, string> = {
  general: "General feedback",
  competition: "A competition",
  event: "An event or tournament",
  club_performance: "How the club is doing",
  association_performance: "How the association is doing",
  topic: "A topic or decision",
};

export const SUBJECT_TYPES = ["none", "competition", "tournament", "event", "topic"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];
export interface SurveySubject {
  type: SubjectType;
  /** seasonCompetitionId / tournamentId when it is one we hold. */
  id?: string;
  label: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export const LEVELS = ["global", "association", "club", "team"] as const;
export type SurveyLevel = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<SurveyLevel, string> = {
  global: "Everyone (national / all members)",
  association: "An association (national, state, region or city)",
  club: "A club",
  team: "A team",
};

export const AUDIENCE_GROUPS = ["player", "coach", "manager", "umpire", "volunteer"] as const;
export type AudienceGroup = (typeof AUDIENCE_GROUPS)[number];
export const GROUP_LABELS: Record<AudienceGroup, string> = { player: "Players", coach: "Coaches", manager: "Managers", umpire: "Umpires", volunteer: "Volunteers" };

export interface SurveyAudience {
  /** Only these teams (club / association level). Empty = no team limit. */
  teamIds: string[];
  /** Only people this age or younger. */
  maxAge: number | null;
  /** Juniors are asked through their parents / guardians. */
  includeGuardians: boolean;
  /** Only people holding one of these roles. Empty = everyone in the scope. */
  groups: AudienceGroup[];
  /** Only people who took part in this competition or tournament. */
  participantsOf: { type: "competition" | "tournament"; id: string } | null;
}

export interface SurveyDelivery {
  /** A notification in the app and an entry under My surveys. */
  inApp: boolean;
  /** Also open it as a pop-up form the next time they use the app. */
  popup: boolean;
  /** Email with a link that works without signing in. */
  email: boolean;
}

export const STATUSES = ["draft", "scheduled", "open", "closed"] as const;
export type SurveyStatus = (typeof STATUSES)[number];

export interface SurveyInput {
  title: string;
  intro: string;
  thanks: string;
  purpose: Purpose;
  subject: SurveySubject;
  level: SurveyLevel;
  scopeId: string;
  /** Association level: also reach the clubs of the associations below it (a state survey reaches its regions). */
  includeBelow: boolean;
  audience: SurveyAudience;
  questions: SurveyQuestion[];
  delivery: SurveyDelivery;
  /** Answers are kept apart from names. Results are only shown once enough people have answered. */
  anonymous: boolean;
  opensAt: string;
  closesAt: string;
  /** Remind people who haven't answered this many days before it closes (null = no reminder). */
  remindDaysBefore: number | null;
}

export interface Survey extends SurveyInput {
  surveyId: string;
  status: SurveyStatus;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
  invited?: number;
}

/** One answer. single/yes_no → value "optionId"/"yes"/"no"; multi → string[]; rating/scale10 → number; ranking → optionIds in order; text → string. */
export type AnswerValue = string | number | string[] | null;
export interface SurveyAnswer { questionId: string; value: AnswerValue; other?: string }

export const MIN_ANONYMOUS_RESPONSES = 5;
