// lib/surveys/templates.ts
// Ready-made surveys to start from. The builder copies one in; everything can be changed afterwards.

import type { Purpose, SubjectType, SurveyQuestion } from "@/lib/surveys/types";

export interface SurveyTemplate {
  key: string;
  name: string;
  description: string;
  purpose: Purpose;
  subjectType: SubjectType;
  anonymous: boolean;
  title: string;
  intro: string;
  questions: SurveyQuestion[];
}

const opt = (...labels: string[]) => labels.map((label, i) => ({ id: `o${i + 1}`, label }));

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    key: "season-club",
    name: "End-of-season club feedback",
    description: "How the club did this season: coaching, communication, facilities, value for money.",
    purpose: "club_performance", subjectType: "none", anonymous: true,
    title: "Season feedback",
    intro: "Thanks for being part of our club this season. Your honest answers help us plan the next one.",
    questions: [
      { id: "overall", type: "scale10", text: "Overall, how likely are you to recommend our club to a friend?", required: true, lowLabel: "Not at all likely", highLabel: "Extremely likely" },
      { id: "coaching", type: "rating", text: "Coaching and player development", required: true, lowLabel: "Poor", highLabel: "Excellent" },
      { id: "comms", type: "rating", text: "Communication from the club", required: true, lowLabel: "Poor", highLabel: "Excellent" },
      { id: "facilities", type: "rating", text: "Facilities and equipment", required: true, lowLabel: "Poor", highLabel: "Excellent" },
      { id: "value", type: "rating", text: "Value for money", required: true, lowLabel: "Poor", highLabel: "Excellent" },
      { id: "again", type: "yes_no", text: "Do you plan to play or be involved again next season?", required: true },
      { id: "best", type: "text", text: "What did we do best?", required: false },
      { id: "better", type: "text", text: "What should we improve?", required: false },
    ],
  },
  {
    key: "competition-feedback",
    name: "Competition feedback",
    description: "A season's competition: fixtures, umpiring, grounds, the way it was run.",
    purpose: "competition", subjectType: "competition", anonymous: true,
    title: "Competition feedback",
    intro: "Tell us how the competition worked for you.",
    questions: [
      { id: "overall", type: "rating", text: "Overall rating of the competition", required: true, lowLabel: "Poor", highLabel: "Excellent" },
      { id: "fixtures", type: "rating", text: "Fixture times and scheduling", required: true },
      { id: "umpiring", type: "rating", text: "Standard of umpiring", required: true },
      { id: "grounds", type: "rating", text: "Grounds and facilities", required: true },
      { id: "grading", type: "single", text: "How well matched were the teams you played?", required: true, options: opt("Mostly too easy", "About right", "Mostly too hard") },
      { id: "format", type: "text", text: "Anything you'd change about how the competition is run?", required: false },
    ],
  },
  {
    key: "event-feedback",
    name: "Event or tournament feedback",
    description: "After a state titles, carnival or presentation night: organisation, venue, accommodation, value.",
    purpose: "event", subjectType: "tournament", anonymous: true,
    title: "Event feedback",
    intro: "Thanks for taking part. Please tell us how the event went.",
    questions: [
      { id: "overall", type: "scale10", text: "How likely are you to recommend this event to others?", required: true, lowLabel: "Not at all likely", highLabel: "Extremely likely" },
      { id: "org", type: "rating", text: "How well was the event organised?", required: true },
      { id: "venue", type: "rating", text: "Venue and playing surfaces", required: true },
      { id: "comms", type: "rating", text: "Communication before and during the event", required: true },
      { id: "cost", type: "single", text: "Was the cost of attending reasonable?", required: true, options: opt("Good value", "Fair", "Too expensive") },
      { id: "liked", type: "text", text: "What worked well?", required: false },
      { id: "improve", type: "text", text: "What should be done differently next time?", required: false },
    ],
  },
  {
    key: "umpire-feedback",
    name: "Umpire and officials feedback",
    description: "How teams and players found the umpiring this season.",
    purpose: "general", subjectType: "none", anonymous: true,
    title: "Umpiring feedback",
    intro: "We want to support our umpires and keep improving. Your feedback is anonymous.",
    questions: [
      { id: "consistency", type: "rating", text: "Consistency of decisions", required: true },
      { id: "manner", type: "rating", text: "Manner and communication on the field", required: true },
      { id: "safety", type: "rating", text: "Player safety being kept front of mind", required: true },
      { id: "appointments", type: "yes_no", text: "Were umpires usually at your games on time and ready?", required: true },
      { id: "comments", type: "text", text: "Anything else you'd like to say?", required: false },
    ],
  },
  {
    key: "parent-satisfaction",
    name: "Parent and guardian satisfaction",
    description: "How families find the club: safety, communication, fees, volunteering.",
    purpose: "club_performance", subjectType: "none", anonymous: true,
    title: "Parent and guardian survey",
    intro: "Our juniors are at the heart of the club. Please tell us how things look from your side.",
    questions: [
      { id: "enjoy", type: "rating", text: "How much does your child enjoy playing here?", required: true },
      { id: "safe", type: "rating", text: "How safe and welcome does your child feel?", required: true },
      { id: "comms", type: "rating", text: "How good is communication with parents?", required: true },
      { id: "fees", type: "single", text: "How do you find the fees?", required: true, options: opt("Good value", "Fair", "Hard to afford") },
      { id: "help", type: "multi", text: "How could you help the club?", required: false, options: opt("Canteen", "Scoring / timekeeping", "Coaching or managing", "Ground set-up", "Fundraising", "Not able to help right now") },
      { id: "comments", type: "text", text: "Anything else we should know?", required: false },
    ],
  },
  {
    key: "priorities",
    name: "Club upgrade priorities",
    description: "Ask members to put a list of possible projects in order of priority.",
    purpose: "topic", subjectType: "topic", anonymous: false,
    title: "What should we upgrade first?",
    intro: "Funds are limited. Put these projects in the order you think we should tackle them.",
    questions: [
      { id: "rank", type: "ranking", text: "Put these in order, most important first", required: true, options: opt("Clubhouse and change rooms", "Lighting", "Drainage and pitch maintenance", "Canteen and kitchen", "Spectator seating and shade", "Storage and equipment") },
      { id: "other", type: "text", text: "Is there something missing from the list?", required: false },
    ],
  },
  {
    key: "poll",
    name: "Yes / no decision poll",
    description: "A single decision, such as “Should we have an artificial surface?”, with room for comments.",
    purpose: "topic", subjectType: "topic", anonymous: false,
    title: "Should we have an artificial surface?",
    intro: "The committee is considering this and wants to hear from members before deciding.",
    questions: [
      { id: "vote", type: "single", text: "Should we pursue it?", required: true, options: opt("Yes", "No", "Not sure yet") },
      { id: "pay", type: "single", text: "Would you support a small levy to help fund it?", required: false, options: opt("Yes", "Maybe", "No") },
      { id: "why", type: "text", text: "What is the main reason for your answer?", required: false },
    ],
  },
  {
    key: "pulse",
    name: "Quick pulse check",
    description: "One question and a comment: very fast to answer.",
    purpose: "general", subjectType: "none", anonymous: true,
    title: "Quick check-in",
    intro: "One quick question.",
    questions: [
      { id: "nps", type: "scale10", text: "How likely are you to recommend us to a friend?", required: true, lowLabel: "Not at all likely", highLabel: "Extremely likely" },
      { id: "why", type: "text", text: "What is the main reason for your score?", required: false },
    ],
  },
];
