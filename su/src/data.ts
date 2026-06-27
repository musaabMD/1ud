import type { Exam } from "./types";

export const C = {
  green: "#58CC02",
  greenDark: "#46A302",
  greenWash: "#E5FFD2",
  teal: "#00C2B8",
  tealDark: "#00A29A",
  gold: "#FFC800",
  goldDark: "#E0AC00",
  purple: "#7C3AED",
  purpleWash: "#EADCFB",
  purpleBtn: "#D8B4FE",
  purpleBtnDark: "#B68AE8",
  red: "#FF4B4B",
  eel: "#3C3C3C",
  wolf: "#777777",
  hare: "#AFAFAF",
  swan: "#E5E5E5",
  polar: "#F7F7F7",
  white: "#FFFFFF",
};

export const EXAMS: Exam[] = [
  { title: "Family Medicine", role: "FM" },
  { title: "SDLE", role: "Dentist" },
  { title: "SLLE", role: "Lab specialist" },
  { title: "SMLE", role: "Physician" },
  { title: "SNLE", role: "Nursing" },
  { title: "SPLE", role: "Pharmacist" },
];

export function examColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { color: `hsl(${h} 60% 42%)`, wash: `hsl(${h} 70% 95%)` };
}

export const FEATURES = [
  ["Unlimited exam access", "Practice across every available qbank"],
  ["AI assistant 24/7", "Ask questions and get expert answers"],
  ["Review & exam mode", "Study or simulate real exam conditions"],
  ["Unlimited questions", "Go beyond the 20 free per 24 hours"],
  ["Quizzes & mock exams", "Timed sets, flashcards, analytics"],
];

export const BASIC_FEATURES = [
  { ok: true, t: "20 questions per rolling 24 hours" },
  { ok: true, t: "Qbank practice access" },
  { ok: false, t: "No AI assistant" },
  { ok: false, t: "No flashcards or detailed analytics" },
];

export const QS = [
  { q: "Which nerve innervates the diaphragm?", s: "Anatomy", st: "correct" },
  { q: "First-line treatment for anaphylaxis?", s: "Pharmacology", st: "incorrect" },
  { q: "Hallmark of Hodgkin lymphoma?", s: "Pathology", st: "flagged" },
  { q: "Resting membrane potential of a neuron?", s: "Physiology", st: "correct" },
];

export const SUBJECTS = [
  { n: "Anatomy", q: 165 },
  { n: "Physiology", q: 149 },
  { n: "Pharmacology", q: 140 },
  { n: "Pathology", q: 123 },
];

export const STAGS = [
  { n: "High-yield", q: 138 },
  { n: "Weak spots", q: 100 },
  { n: "Exam favourites", q: 99 },
  { n: "Must review", q: 64 },
];

export const BD = [
  { n: "Anatomy", c: 142, i: 23 },
  { n: "Physiology", c: 118, i: 31 },
  { n: "Pharmacology", c: 96, i: 44 },
];
