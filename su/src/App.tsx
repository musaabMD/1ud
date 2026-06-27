import type { EmailOtpType, User } from "@supabase/supabase-js";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BarChart3, BookOpen, Check, ChevronRight, Flag,
  GraduationCap, Loader2, RefreshCw, RotateCcw, Search, Sparkles,
  Star, X,
} from "lucide-react";
import { supabase } from "./supabase";

const AUTH_REDIRECT_URL = "https://old.drnote.co/";

const C = {
  green: "#58CC02", greenDark: "#46A302", greenWash: "#E5FFD2",
  teal: "#00C2B8",
  gold: "#FFC800",
  purple: "#7C3AED", purpleWash: "#EADCFB", purpleBtn: "#D8B4FE", purpleBtnDark: "#B68AE8",
  red: "#FF4B4B",
  eel: "#3C3C3C", wolf: "#777777", hare: "#AFAFAF",
  swan: "#E5E5E5", polar: "#F7F7F7", white: "#FFFFFF",
};

type Exam = { id: string; name: string; initials: string; category: string; clicks: number | null; description: string };
type SubjectRow = { n: string; q: number };
type QState = {
  question_id: string;
  examname: string;
  subject: string | null;
  file_name: string | null;
  selected_choice: string | null;
  is_correct: boolean | null;
  is_flagged: boolean;
  is_bookmarked: boolean;
  answered_at: string | null;
};
type Question = {
  id: string;
  question_text: string;
  examname: string;
  exam_id: string | null;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  option_f: string | null;
  correct_choice: string;
  rationale: string | null;
  file_name: string | null;
  subject: string | null;
  question_image_url: string | null;
  explanation_image_url: string | null;
};
type QuizSession = {
  title: string;
  subtitle: string;
  questions: Question[];
  initialIndex?: number;
  reviewOnly?: boolean;
};

function examColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { color: `hsl(${h} 60% 42%)`, wash: `hsl(${h} 70% 95%)` };
}

function isRecoveryRedirect() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
}

function getRecoveryOtpRedirect() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || type !== "recovery") return null;
  return { tokenHash, type };
}

const FEATURES = [
  ["Unlimited exam access", "Practice across every available qbank"],
  ["AI assistant 24/7", "Ask questions and get expert answers"],
  ["Review & exam mode", "Study or simulate real exam conditions"],
  ["Unlimited questions", "Go beyond the 20 free per 24 hours"],
  ["Quizzes & mock exams", "Timed sets, flashcards, analytics"],
];
const BASIC_FEATURES = [
  { ok: true, t: "20 questions per rolling 24 hours" },
  { ok: true, t: "Qbank practice access" },
  { ok: false, t: "No AI assistant" },
  { ok: false, t: "No flashcards or detailed analytics" },
];

const QUESTION_SELECT = "id,question_text,examname,exam_id,option_a,option_b,option_c,option_d,option_e,option_f,correct_choice,rationale,file_name,subject,question_image_url,explanation_image_url";
const PAGE_SIZE = 1000;
const CHOICES = ["A", "B", "C", "D", "E", "F"] as const;

function cleanChoice(choice: string | null | undefined) {
  return (choice ?? "").trim().toUpperCase();
}

function optionsFor(question: Question) {
  return CHOICES
    .map((choice) => ({ choice, text: question[`option_${choice.toLowerCase()}` as keyof Question] as string | null }))
    .filter((option) => Boolean(option.text?.trim()));
}

function upsertState(rows: QState[], next: QState) {
  const index = rows.findIndex((row) => row.question_id === next.question_id);
  if (index === -1) return [next, ...rows];
  const copy = rows.slice();
  copy[index] = next;
  return copy;
}

/* ---------------- Auth modal ---------------- */
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function switchMode(next: "signin" | "signup" | "reset") {
    setMode(next); setError(""); setDone(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("Supabase is not configured."); return; }
    setLoading(true); setError("");
    try {
      if (mode === "reset") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: AUTH_REDIRECT_URL,
        });
        if (err) throw err;
        setDone(true);
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        if (err) throw err;
        if (data.user && !data.session) { setDone(true); return; }
        if (data.user) { onSuccess(data.user); onClose(); }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user) { onSuccess(data.user); onClose(); }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const titles = { signin: "Welcome back", signup: "Create account", reset: "Reset password" };
  const subs = { signin: "Sign in to your Drnote account", signup: "Start studying for free", reset: "Enter your email to get a reset link" };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-3xl p-7" style={{ background: C.white }}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-2xl" style={{ background: C.polar }}>
          <X size={20} strokeWidth={3} color={C.wolf} />
        </button>
        <div className="mb-5 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl text-lg font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>D</span>
          <h2 className="mt-3 text-2xl font-black" style={{ color: C.eel }}>{titles[mode]}</h2>
          <p className="mt-1 text-sm font-bold" style={{ color: C.hare }}>{subs[mode]}</p>
        </div>

        {done ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: C.greenWash }}>
            <Check size={28} strokeWidth={3} color={C.green} className="mx-auto" />
            <p className="mt-2 font-black" style={{ color: C.eel }}>
              {mode === "reset" ? "Reset link sent!" : "Check your email"}
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: C.wolf }}>
              {mode === "reset"
                ? `We sent a password reset link to ${email}.`
                : `We sent a confirmation link to ${email}.`}
            </p>
            {mode === "reset" && (
              <button type="button" onClick={() => switchMode("signin")} className="mt-3 text-sm font-black" style={{ color: C.green }}>
                Back to sign in
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-2xl px-4 py-3 font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            {mode !== "reset" && (
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-2xl px-4 py-3 font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            )}
            {mode === "signin" && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => switchMode("reset")} className="text-xs font-black" style={{ color: C.hare }}>
                  Forgot password?
                </button>
              </div>
            )}
            {error && <p className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "#FFF0F0", color: C.red }}>{error}</p>}
            <button type="submit" disabled={loading} className="mt-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-white disabled:opacity-50" style={{ background: C.green, boxShadow: `0 4px 0 ${C.greenDark}` }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </form>
        )}

        {!done && mode !== "reset" && (
          <p className="mt-4 text-center text-sm font-bold" style={{ color: C.hare }}>
            {mode === "signin" ? "New to Drnote? " : "Already have an account? "}
            <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="font-black" style={{ color: C.green }}>
              {mode === "signin" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        )}
        {!done && mode === "reset" && (
          <p className="mt-4 text-center text-sm font-bold" style={{ color: C.hare }}>
            <button type="button" onClick={() => switchMode("signin")} className="font-black" style={{ color: C.green }}>← Back to sign in</button>
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Set new password modal (recovery flow) ---------------- */
function SetNewPasswordModal({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!supabase) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      window.location.hash = "";
      setTimeout(onDone, 2000);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-3xl p-7" style={{ background: C.white }}>
        <div className="mb-5 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl text-lg font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>D</span>
          <h2 className="mt-3 text-2xl font-black" style={{ color: C.eel }}>Set new password</h2>
          <p className="mt-1 text-sm font-bold" style={{ color: C.hare }}>Choose a strong password for your account</p>
        </div>
        {done ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: C.greenWash }}>
            <Check size={28} strokeWidth={3} color={C.green} className="mx-auto" />
            <p className="mt-2 font-black" style={{ color: C.eel }}>Password updated!</p>
            <p className="mt-1 text-sm font-bold" style={{ color: C.wolf }}>You're now signed in.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full rounded-2xl px-4 py-3 font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full rounded-2xl px-4 py-3 font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            {error && <p className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: "#FFF0F0", color: C.red }}>{error}</p>}
            <button type="submit" disabled={loading} className="mt-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-white disabled:opacity-50" style={{ background: C.green, boxShadow: `0 4px 0 ${C.greenDark}` }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------------- Pricing popup ---------------- */
function Pricing({ onClose, examTitle, onGetStarted }: { onClose: () => void; examTitle?: string; onGetStarted: () => void }) {
  const [plan, setPlan] = useState<string>("annual");
  const card = (id: string, extra: React.CSSProperties = {}) => ({
    background: id === "annual" ? C.greenWash : C.white,
    border: `3px solid ${plan === id ? C.green : id === "annual" ? C.green : C.swan}`,
    boxShadow: `0 4px 0 ${plan === id || id === "annual" ? C.greenDark : C.swan}`,
    ...extra,
  });
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:items-center">
      <div className="relative w-full max-w-4xl rounded-3xl p-6 md:p-8" style={{ background: C.white }}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-2xl" style={{ background: C.polar }}><X size={22} strokeWidth={3} color={C.wolf} /></button>
        <div className="text-center">
          <h2 className="text-3xl font-black md:text-4xl" style={{ color: C.eel }}>Unlock everything with Pro</h2>
          <p className="mt-2 font-bold" style={{ color: C.wolf }}>Unlimited practice, exam-like preparation, and more.</p>
        </div>
        <div className="mx-auto mt-6 max-w-2xl space-y-2.5">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg" style={{ background: C.greenWash, color: C.green }}><Check size={15} strokeWidth={4} /></span>
              <p className="font-bold" style={{ color: C.eel }}><span className="font-black">{t}</span> <span style={{ color: C.hare }}>— {d}</span></p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setPlan("basic")} className="rounded-3xl p-5 text-left outline-none transition-all duration-75 active:translate-y-0.5" style={card("basic")}>
            <span className="inline-block rounded-full px-3 py-0.5 text-xs font-black" style={{ background: C.greenWash, color: C.greenDark }}>Free trial</span>
            <p className="mt-2 text-2xl font-black" style={{ color: C.eel }}>Basic</p>
            <p className="mt-1 leading-none"><span className="text-4xl font-black" style={{ color: C.eel }}>$0</span> <span className="font-bold" style={{ color: C.hare }}>/ day</span></p>
            <p className="mt-2 font-black" style={{ color: C.eel }}>20 questions per 24 hours</p>
            <div className="mt-3 space-y-1.5">
              {BASIC_FEATURES.map((f) => (
                <div key={f.t} className="flex items-center gap-2">
                  {f.ok ? <Check size={16} strokeWidth={4} color={C.green} /> : <X size={16} strokeWidth={4} color={C.hare} />}
                  <span className="text-sm font-bold" style={{ color: f.ok ? C.eel : C.hare }}>{f.t}</span>
                </div>
              ))}
            </div>
          </button>
          <button type="button" onClick={() => setPlan("annual")} className="relative rounded-3xl p-5 text-center outline-none transition-all duration-75 active:translate-y-0.5" style={card("annual")}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-black" style={{ background: C.purpleWash, color: C.purple }}>50% off</span>
            <p className="text-xl font-black" style={{ color: C.eel }}>Annual</p>
            <p className="mt-2 leading-none"><span className="text-4xl font-black" style={{ color: C.eel }}>$120.00</span> <span className="font-bold" style={{ color: C.hare }}>/ yr</span></p>
            <p className="mt-2 text-sm font-bold"><span className="line-through" style={{ color: C.red }}>$300.00</span> <span style={{ color: C.wolf }}>per year</span></p>
            <p className="mt-1 text-sm font-bold" style={{ color: C.wolf }}>billed yearly · $0.33/day</p>
          </button>
          <button type="button" onClick={() => setPlan("monthly")} className="rounded-3xl p-5 text-center outline-none transition-all duration-75 active:translate-y-0.5" style={card("monthly")}>
            <p className="text-xl font-black" style={{ color: C.eel }}>Monthly</p>
            <p className="mt-2 leading-none"><span className="text-4xl font-black" style={{ color: C.eel }}>$25.00</span> <span className="font-bold" style={{ color: C.hare }}>/ mo</span></p>
            <p className="mt-2 text-sm font-bold" style={{ color: C.wolf }}>billed monthly · $0.83/day</p>
          </button>
        </div>
        <button type="button" onClick={onGetStarted} className="mx-auto mt-7 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black tracking-wide outline-none active:translate-y-0.5"
          style={{ background: C.purpleBtn, color: C.eel, boxShadow: `0 5px 0 ${C.purpleBtnDark}` }}>
          <Sparkles size={20} strokeWidth={3} /> {examTitle ? "Start free trial" : "Choose an exam first"}
        </button>
        <p className="mt-3 text-center text-xs font-bold" style={{ color: C.hare }}>Free trial includes 20 questions in a rolling 24-hour window. Upgrade anytime.</p>
      </div>
    </div>
  );
}

/* ---------------- Exam detail ---------------- */
const E_TABS = [
  { id: "study", label: "Study", icon: BookOpen },
  { id: "exam", label: "Exam", icon: GraduationCap },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "review", label: "Review", icon: RefreshCw },
] as const;

const ST = {
  correct: { c: C.green, I: Check, label: "Correct" },
  incorrect: { c: C.red, I: X, label: "Incorrect" },
  flagged: { c: C.gold, I: Flag, label: "Flagged" },
} as const;

function QuestionRunner({ session, statesById, onClose, onSave }: {
  session: QuizSession;
  statesById: Record<string, QState | undefined>;
  onClose: () => void;
  onSave: (question: Question, selectedChoice: string | null, isCorrect: boolean | null, isFlagged: boolean) => Promise<void>;
}) {
  const [i, setI] = useState(session.initialIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, { selected_choice: string | null; is_correct: boolean | null; is_flagged: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(false);

  useEffect(() => {
    const next: Record<string, { selected_choice: string | null; is_correct: boolean | null; is_flagged: boolean }> = {};
    for (const q of session.questions) {
      const state = statesById[q.id];
      next[q.id] = {
        selected_choice: state?.selected_choice ?? null,
        is_correct: state?.is_correct ?? null,
        is_flagged: state?.is_flagged ?? false,
      };
    }
    setAnswers(next);
    setI(session.initialIndex ?? 0);
    setReport(false);
  }, [session, statesById]);

  const q = session.questions[i];
  const answer = q ? answers[q.id] : undefined;
  const selected = answer?.selected_choice ?? null;
  const correctChoice = cleanChoice(q?.correct_choice);
  const answeredCount = session.questions.filter((item) => answers[item.id]?.selected_choice).length;
  const correctCount = session.questions.filter((item) => answers[item.id]?.is_correct).length;
  const incorrectCount = session.questions.filter((item) => answers[item.id]?.is_correct === false).length;

  async function choose(choice: string) {
    if (!q || saving || session.reviewOnly) return;
    const isCorrect = choice === correctChoice;
    const next = { selected_choice: choice, is_correct: isCorrect, is_flagged: answer?.is_flagged ?? false };
    setAnswers((prev) => ({ ...prev, [q.id]: next }));
    setSaving(true);
    try {
      await onSave(q, choice, isCorrect, next.is_flagged);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag() {
    if (!q || saving) return;
    const next = { selected_choice: selected, is_correct: answer?.is_correct ?? null, is_flagged: !(answer?.is_flagged ?? false) };
    setAnswers((prev) => ({ ...prev, [q.id]: next }));
    setSaving(true);
    try {
      await onSave(q, next.selected_choice, next.is_correct, next.is_flagged);
    } finally {
      setSaving(false);
    }
  }

  if (!q) return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center" style={{ background: C.polar }}>
      <p className="text-xl font-black" style={{ color: C.eel }}>No questions found</p>
      <button type="button" onClick={onClose} className="rounded-2xl px-5 py-3 font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>Back</button>
    </div>
  );

  if (report) return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: C.polar }}>
      <header className="flex-none px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" aria-label="Back" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><ArrowLeft size={22} strokeWidth={3} color={C.wolf} /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black" style={{ color: C.eel }}>{session.title}</p>
            <p className="text-xs font-bold" style={{ color: C.hare }}>Report</p>
          </div>
        </div>
      </header>
      <main className="no-bar flex-1 overflow-y-auto px-5 pb-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl p-6 text-center" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
            <p className="text-sm font-black uppercase" style={{ color: C.hare }}>Score</p>
            <p className="text-6xl font-black" style={{ color: correctCount >= incorrectCount ? C.green : C.red }}>{answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0}%</p>
            <p className="mt-2 font-bold" style={{ color: C.wolf }}>{correctCount} correct · {incorrectCount} incorrect · {answeredCount} answered</p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {session.questions.map((item, index) => {
              const state = answers[item.id];
              const isCorrect = state?.is_correct === true;
              return (
                <button key={item.id} type="button" onClick={() => { setI(index); setReport(false); }} className="flex items-center gap-3 rounded-2xl p-3 text-left" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: isCorrect ? C.greenWash : "#FFF0F0", color: isCorrect ? C.green : C.red }}>{isCorrect ? <Check size={20} strokeWidth={4} /> : <X size={20} strokeWidth={4} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black" style={{ color: C.eel }}>{item.question_text}</p>
                    <p className="text-xs font-bold" style={{ color: C.hare }}>{item.subject || "General"} · {item.file_name || item.examname}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: C.polar }}>
      <header className="flex-none px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" aria-label="Back" onClick={onClose} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><ArrowLeft size={22} strokeWidth={3} color={C.wolf} /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black leading-tight" style={{ color: C.eel }}>{session.title}</p>
            <p className="text-xs font-bold" style={{ color: C.hare }}>{i + 1} of {session.questions.length} · {session.subtitle}</p>
          </div>
          <button type="button" onClick={toggleFlag} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: answer?.is_flagged ? C.gold : C.white, color: answer?.is_flagged ? C.white : C.hare, boxShadow: `0 2px 0 ${answer?.is_flagged ? "#D69A00" : C.swan}` }}><Flag size={20} strokeWidth={3} /></button>
        </div>
      </header>
      <main className="no-bar flex-1 overflow-y-auto px-5 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl p-5" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
            <p className="text-sm font-black uppercase" style={{ color: C.hare }}>{q.subject || "Question"}</p>
            <h2 className="mt-2 whitespace-pre-wrap text-xl font-black leading-snug" style={{ color: C.eel }}>{q.question_text}</h2>
            {q.question_image_url && <img src={q.question_image_url} alt="" className="mt-4 max-h-72 w-full rounded-2xl object-contain" />}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {optionsFor(q).map((option) => {
              const isSelected = selected === option.choice;
              const isCorrect = correctChoice === option.choice;
              const reveal = Boolean(selected) || session.reviewOnly;
              const bg = reveal && isCorrect ? C.greenWash : reveal && isSelected && !isCorrect ? "#FFF0F0" : C.white;
              const border = reveal && isCorrect ? C.green : reveal && isSelected && !isCorrect ? C.red : C.swan;
              return (
                <button key={option.choice} type="button" disabled={session.reviewOnly || saving} onClick={() => choose(option.choice)} className="flex items-start gap-3 rounded-2xl p-4 text-left outline-none active:translate-y-0.5 disabled:cursor-default" style={{ background: bg, border: `2px solid ${border}`, boxShadow: `0 3px 0 ${border}` }}>
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-xl text-sm font-black" style={{ background: isSelected || (reveal && isCorrect) ? border : C.polar, color: isSelected || (reveal && isCorrect) ? C.white : C.wolf }}>{option.choice}</span>
                  <span className="font-bold leading-snug" style={{ color: C.eel }}>{option.text}</span>
                </button>
              );
            })}
          </div>
          {(selected || session.reviewOnly) && (
            <div className="mt-4 rounded-2xl p-4" style={{ background: selected === correctChoice || session.reviewOnly ? C.greenWash : "#FFF0F0" }}>
              <p className="font-black" style={{ color: selected === correctChoice || session.reviewOnly ? C.greenDark : C.red }}>
                Correct answer: {correctChoice}
              </p>
              {q.rationale && <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-relaxed" style={{ color: C.eel }}>{q.rationale}</p>}
              {q.explanation_image_url && <img src={q.explanation_image_url} alt="" className="mt-4 max-h-72 w-full rounded-2xl object-contain" />}
            </div>
          )}
        </div>
      </main>
      <nav className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="mx-auto flex max-w-3xl gap-2 rounded-3xl p-2" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}, 0 12px 30px rgba(0,0,0,.1)` }}>
          <button type="button" disabled={i === 0} onClick={() => setI((v) => Math.max(0, v - 1))} className="flex-1 rounded-2xl py-3 font-black disabled:opacity-40" style={{ background: C.polar, color: C.eel }}>Back</button>
          {i === session.questions.length - 1 ? (
            <button type="button" onClick={() => setReport(true)} className="flex-1 rounded-2xl py-3 font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>{session.reviewOnly ? "Summary" : "Finish"}</button>
          ) : (
            <button type="button" onClick={() => setI((v) => Math.min(session.questions.length - 1, v + 1))} className="flex-1 rounded-2xl py-3 font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>Next</button>
          )}
        </div>
      </nav>
    </div>
  );
}

function ExamDetail({ exam, onBack, onUpgrade, user, onAuthRequest }: {
  exam: Exam; onBack: () => void; onUpgrade: () => void;
  user: User | null; onAuthRequest: () => void;
}) {
  const [t, setT] = useState<string>("study");
  const [ssub, setSsub] = useState<"Subjects" | "Tags">("Subjects");
  const [rev, setRev] = useState<"All" | "Incorrect" | "Flagged" | "Correct">("All");
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [tags, setTags] = useState<SubjectRow[]>([]);
  const [studyLoading, setStudyLoading] = useState(true);
  const [qStates, setQStates] = useState<QState[]>([]);
  const [questionById, setQuestionById] = useState<Record<string, Question>>({});
  const [stateLoading, setStateLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [session, setSession] = useState<QuizSession | null>(null);

  async function fetchQuestionGroups() {
    if (!supabase) return;
    const client = supabase;
    setStudyLoading(true);
    const subCount: Record<string, number> = {};
    const tagCount: Record<string, number> = {};
    const addRows = (rows: { subject: string | null; file_name: string | null }[]) => {
      for (const row of rows) {
        if (row.subject) subCount[row.subject] = (subCount[row.subject] || 0) + 1;
        if (row.file_name) tagCount[row.file_name] = (tagCount[row.file_name] || 0) + 1;
      }
    };
    const first = await supabase
      .from("qs")
      .select("subject,file_name", { count: "exact" })
      .eq("exam_id", exam.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(0, PAGE_SIZE - 1);
    if (first.error) {
      setStudyLoading(false);
      return;
    }
    addRows(first.data ?? []);
    const totalRows = first.count ?? first.data?.length ?? 0;
    const ranges = [];
    for (let from = PAGE_SIZE; from < totalRows; from += PAGE_SIZE) ranges.push(from);
    for (let i = 0; i < ranges.length; i += 6) {
      const pages = await Promise.all(ranges.slice(i, i + 6).map((from) =>
        client
          .from("qs")
          .select("subject,file_name")
          .eq("exam_id", exam.id)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
      ));
      pages.forEach((page) => addRows(page.data ?? []));
    }
    setSubjects(Object.entries(subCount).map(([n, q]) => ({ n, q })).sort((a, b) => b.q - a.q));
    setTags(Object.entries(tagCount).map(([n, q]) => ({ n, q })).sort((a, b) => a.n.localeCompare(b.n)));
    setStudyLoading(false);
  }

  async function fetchQuestions(filter: { subject?: string; fileName?: string; limit?: number }) {
    if (!supabase) return [];
    const client = supabase;
    const buildQuery = (from: number, to: number, withCount = false) => {
      let query = client
        .from("qs")
        .select(QUESTION_SELECT, withCount ? { count: "exact" } : undefined)
        .eq("exam_id", exam.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      if (filter.subject) query = query.eq("subject", filter.subject);
      if (filter.fileName) query = query.eq("file_name", filter.fileName);
      return query;
    };
    const max = filter.limit ?? 100000;
    const first = await buildQuery(0, Math.min(PAGE_SIZE - 1, max - 1), true);
    const all = ((first.data ?? []) as Question[]);
    const totalRows = Math.min(first.count ?? all.length, max);
    const ranges = [];
    for (let from = PAGE_SIZE; from < totalRows; from += PAGE_SIZE) ranges.push(from);
    for (let i = 0; i < ranges.length; i += 4) {
      const pages = await Promise.all(ranges.slice(i, i + 4).map((from) => buildQuery(from, Math.min(from + PAGE_SIZE - 1, totalRows - 1))));
      pages.forEach((page) => all.push(...((page.data ?? []) as Question[])));
    }
    setQuestionById((prev) => ({ ...prev, ...Object.fromEntries(all.map((q) => [q.id, q])) }));
    return all;
  }

  async function fetchQuestionsByIds(ids: string[]) {
    if (!supabase || ids.length === 0) return [];
    const unique = Array.from(new Set(ids));
    const found: Question[] = [];
    for (let i = 0; i < unique.length; i += 200) {
      const chunk = unique.slice(i, i + 200);
      const { data } = await supabase.from("qs").select(QUESTION_SELECT).in("id", chunk);
      found.push(...((data ?? []) as Question[]));
    }
    const map = Object.fromEntries(found.map((q) => [q.id, q]));
    setQuestionById((prev) => ({ ...prev, ...map }));
    return unique.map((id) => map[id]).filter(Boolean) as Question[];
  }

  async function loadUserStates() {
    if (!user || !supabase) { setQStates([]); return; }
    setStateLoading(true);
    const { data } = await supabase
      .from("user_question_state")
      .select("question_id,examname,subject,file_name,selected_choice,is_correct,is_flagged,is_bookmarked,answered_at")
      .eq("user_id", user.id)
      .eq("examname", exam.initials)
      .order("updated_at", { ascending: false });
    const rows = (data ?? []) as QState[];
    setQStates(rows);
    await fetchQuestionsByIds(rows.map((row) => row.question_id));
    setStateLoading(false);
  }

  useEffect(() => { fetchQuestionGroups(); }, [exam.id]);
  useEffect(() => { loadUserStates(); }, [user?.id, exam.initials]);

  const statesById = Object.fromEntries(qStates.map((row) => [row.question_id, row]));
  const correct = qStates.filter((r) => r.is_correct === true).length;
  const incorrect = qStates.filter((r) => r.is_correct === false).length;
  const flagged = qStates.filter((r) => r.is_flagged).length;
  const total = qStates.filter((r) => r.selected_choice).length;
  const ov = total > 0 ? Math.round((correct / total) * 100) : 0;
  const filteredStates = qStates.filter((r) => {
    if (rev === "Incorrect") return r.is_correct === false;
    if (rev === "Flagged") return r.is_flagged;
    if (rev === "Correct") return r.is_correct === true;
    return true;
  });

  function requireUser() {
    if (user) return true;
    onAuthRequest();
    return false;
  }

  async function openSession(nextSession: Omit<QuizSession, "questions">, loader: () => Promise<Question[]>) {
    if (!requireUser()) return;
    setLoadingAction(nextSession.title);
    try {
      const questions = await loader();
      setSession({ ...nextSession, questions });
    } finally {
      setLoadingAction("");
    }
  }

  async function openReview(states: QState[], index = 0, title = "Review") {
    if (!requireUser()) return;
    setLoadingAction(title);
    try {
      const questions = await fetchQuestionsByIds(states.map((row) => row.question_id));
      setSession({ title, subtitle: `${questions.length} questions`, questions, initialIndex: index, reviewOnly: true });
    } finally {
      setLoadingAction("");
    }
  }

  async function saveQuestionState(question: Question, selectedChoice: string | null, isCorrect: boolean | null, isFlagged: boolean) {
    if (!user || !supabase) { onAuthRequest(); return; }
    const now = new Date().toISOString();
    const row: QState = {
      user_id: user.id,
      question_id: question.id,
      examname: exam.initials,
      subject: question.subject,
      file_name: question.file_name,
      selected_choice: selectedChoice,
      is_correct: isCorrect,
      is_flagged: isFlagged,
      is_bookmarked: false,
      answered_at: selectedChoice ? now : statesById[question.id]?.answered_at ?? null,
    } as QState;
    const { error } = await supabase.from("user_question_state").upsert({
      ...row,
      question_version: 1,
      updated_at: now,
    }, { onConflict: "user_id,question_id" });
    if (error) throw error;
    setQStates((prev) => upsertState(prev, row));
    setQuestionById((prev) => ({ ...prev, [question.id]: question }));
  }

  if (session) return <QuestionRunner session={session} statesById={statesById} onClose={() => { setSession(null); loadUserStates(); }} onSave={saveQuestionState} />;

  const MODES = [
    { t: "Mock Exam", d: "Full timed paper · 90 Q · 90 min", icon: GraduationCap, run: () => openSession({ title: "Mock Exam", subtitle: "90 questions · timed practice" }, () => fetchQuestions({ limit: 90 })) },
    { t: "Review Incorrect", d: `${incorrect || "—"} questions you got wrong`, icon: RotateCcw, run: () => openReview(qStates.filter((row) => row.is_correct === false), 0, "Review Incorrect") },
    { t: "Review Flagged", d: `${flagged || "—"} questions you flagged`, icon: Flag, run: () => openReview(qStates.filter((row) => row.is_flagged), 0, "Review Flagged") },
  ];

  const body = () => {
    if (t === "study") {
      const rows = ssub === "Subjects" ? subjects : tags;
      return (
        <div className="flex flex-col gap-3">
          <div className="flex justify-center gap-2 pb-1">
            {(["Subjects", "Tags"] as const).map((s) => { const on = ssub === s; return (
              <button key={s} type="button" onClick={() => setSsub(s)} className="flex-none rounded-2xl px-5 py-2 text-sm font-extrabold uppercase outline-none active:translate-y-0.5"
                style={on ? { background: C.green, color: C.white, boxShadow: `0 3px 0 ${C.greenDark}` } : { background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>{s}</button>); })}
          </div>
          {studyLoading ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin" color={C.green} /></div>
            : rows.length === 0 ? <p className="py-10 text-center font-bold" style={{ color: C.hare }}>No data yet.</p>
            : rows.map((r) => { const { color, wash } = examColor(r.n); return (
              <button key={r.n} type="button" onClick={() => openSession({ title: r.n, subtitle: `${r.q.toLocaleString()} questions` }, () => ssub === "Subjects" ? fetchQuestions({ subject: r.n }) : fetchQuestions({ fileName: r.n }))} className="flex items-center gap-3 rounded-2xl p-3 text-left outline-none active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: wash, color }}><BookOpen size={20} strokeWidth={2.75} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold" style={{ color: C.eel }}>{r.n}</p>
                  <p className="text-sm font-bold" style={{ color: C.hare }}>{r.q.toLocaleString()} questions</p>
                </div>
                <span className="rounded-2xl px-3 py-2 text-xs font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>{loadingAction === r.n ? "Loading" : "Start"}</span>
              </button>); })}
        </div>
      );
    }

    if (t === "exam") return (
      <div className="flex flex-col gap-3">
        {MODES.map((m) => (
          <button key={m.t} type="button" onClick={m.run} className="flex items-center gap-3 rounded-2xl p-4 text-left outline-none active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-xl" style={{ background: C.greenWash, color: C.green }}><m.icon size={26} strokeWidth={2.75} /></span>
            <div className="min-w-0 flex-1"><p className="font-black" style={{ color: C.eel }}>{m.t}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{m.d}</p></div>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>{loadingAction === m.t ? <Loader2 size={18} className="animate-spin" color={C.white} /> : <ChevronRight size={20} strokeWidth={3.5} color={C.white} />}</span>
          </button>
        ))}
        {!user && <p className="pt-2 text-center text-sm font-bold" style={{ color: C.hare }}>Sign in to track and review your answers.</p>}
      </div>
    );

    if (t === "analysis") {
      const subjectStats = subjects.map((s) => {
        const mine = qStates.filter((r) => r.subject === s.n && r.selected_choice);
        const c = mine.filter((r) => r.is_correct === true).length;
        const i = mine.filter((r) => r.is_correct === false).length;
        return { n: s.n, c, i };
      }).filter((s) => s.c + s.i > 0);
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-5" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
            <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Overall score</p>
            <p className="text-5xl font-black" style={{ color: ov >= 60 ? C.green : C.red }}>{total > 0 ? `${ov}%` : "—"}</p>
            {total > 0 && <>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full" style={{ background: C.swan }}><div className="h-full rounded-full transition-all" style={{ width: `${ov}%`, background: ov >= 60 ? C.green : C.red }} /></div>
              <p className="mt-2 text-sm font-bold" style={{ color: C.hare }}>{correct} correct · {incorrect} incorrect · {flagged} flagged</p>
            </>}
          </div>
          {subjectStats.map((b) => { const p = Math.round((b.c / (b.c + b.i)) * 100); return (
            <div key={b.n} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
              <p className="min-w-0 flex-1 truncate font-extrabold" style={{ color: C.eel }}>{b.n}</p>
              <span className="flex items-center gap-1 text-sm font-extrabold" style={{ color: C.green }}><Check size={14} strokeWidth={4} />{b.c}</span>
              <span className="flex items-center gap-1 text-sm font-extrabold" style={{ color: C.red }}><X size={14} strokeWidth={4} />{b.i}</span>
              <span className="w-12 text-right text-sm font-black" style={{ color: C.eel }}>{p}%</span>
            </div>); })}
        </div>
      );
    }

    if (!user) return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <RefreshCw size={36} strokeWidth={2} color={C.hare} />
        <p className="text-lg font-black" style={{ color: C.eel }}>Sign in to see your review</p>
        <button type="button" onClick={onAuthRequest} className="mt-2 rounded-2xl px-6 py-3 font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>Sign in</button>
      </div>
    );
    if (stateLoading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin" color={C.green} /></div>;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-center gap-2 overflow-x-auto pb-1">
          {(["All", "Incorrect", "Flagged", "Correct"] as const).map((s) => { const on = rev === s; return (
            <button key={s} type="button" onClick={() => setRev(s)} className="flex-none rounded-2xl px-4 py-2 text-sm font-extrabold uppercase outline-none active:translate-y-0.5"
              style={on ? { background: C.green, color: C.white, boxShadow: `0 3px 0 ${C.greenDark}` } : { background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>{s}</button>); })}
        </div>
        {filteredStates.length === 0 ? <p className="py-10 text-center font-bold" style={{ color: C.hare }}>{qStates.length === 0 ? "You haven't answered any questions yet." : `No ${rev.toLowerCase()} questions.`}</p>
          : filteredStates.map((x, i) => {
            const status = x.is_flagged ? "flagged" : x.is_correct ? "correct" : "incorrect";
            const s = ST[status];
            const question = questionById[x.question_id];
            return (
              <button key={x.question_id} type="button" onClick={() => openReview(filteredStates, i, "Review")} className="flex items-center gap-3 rounded-2xl p-3 text-left" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: `${s.c}1A`, color: s.c }}><s.I size={20} strokeWidth={3.5} /></span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-extrabold" style={{ color: C.eel }}>{question?.question_text || `Question ${x.question_id.slice(0, 8)}`}</p>
                  <p className="text-sm font-bold" style={{ color: C.hare }}>{x.subject || "General"} · {x.file_name || exam.initials}</p>
                </div>
                <span className="rounded-xl px-2 py-1 text-xs font-black" style={{ background: `${s.c}1A`, color: s.c }}>{s.label}</span>
              </button>); })}
      </div>
    );
  };

  const { color, wash } = examColor(exam.name);
  return (
    <div className="flex h-full flex-col">
      <header className="flex-none px-5 py-2.5 md:px-10" style={{ background: C.polar }}>
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button type="button" aria-label="Back" onClick={onBack} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><ArrowLeft size={22} strokeWidth={3} color={C.wolf} /></button>
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: wash, color }}><GraduationCap size={18} strokeWidth={2.75} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black leading-tight" style={{ color: C.eel }}>{exam.name.trim()}</p>
            <p className="text-xs font-bold" style={{ color: C.hare }}>{exam.initials}</p>
          </div>
          <button type="button" onClick={onUpgrade} className="rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wide" style={{ color: C.wolf }}>Pricing</button>
          {user ? <span className="grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-black text-white" style={{ background: C.green }}>{user.email?.[0].toUpperCase()}</span>
            : <button type="button" onClick={onAuthRequest} className="rounded-2xl px-4 py-2 text-xs font-black uppercase text-white active:translate-y-0.5" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>Sign in</button>}
        </div>
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-5 pt-4 md:px-6">
          <h1 className="mb-3 text-center text-2xl font-black" style={{ color: C.eel }}>{E_TABS.find((x) => x.id === t)!.label}</h1>
          <div className="no-bar flex-1 overflow-y-auto pb-28">{body()}</div>
        </div>
      </main>
      <nav className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="no-bar pointer-events-auto mx-auto flex w-full max-w-xl gap-1 overflow-x-auto rounded-3xl p-1.5" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}, 0 12px 30px rgba(0,0,0,.1)` }}>
          {E_TABS.map((x) => { const on = t === x.id; const Icon = x.icon; return (
            <button key={x.id} type="button" onClick={() => setT(x.id)} className="flex min-w-[60px] flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2.5 outline-none"
              style={{ background: on ? C.greenWash : "transparent", color: on ? C.greenDark : C.hare }}><Icon size={22} strokeWidth={on ? 3 : 2.5} /><span className="text-[10px] font-extrabold uppercase">{x.label}</span></button>); })}
        </div>
      </nav>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function DrnoteApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);

  const [page, setPage] = useState<"home" | "exam">("home");
  const [exam, setExam] = useState<Exam | null>(null);
  const [pricing, setPricing] = useState(false);
  const [q, setQ] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    const recoveryOtp = getRecoveryOtpRedirect();
    if (recoveryOtp) {
      supabase.auth
        .verifyOtp({ token_hash: recoveryOtp.tokenHash, type: recoveryOtp.type })
        .then(({ data, error }) => {
          if (!error) {
            setUser(data.user ?? data.session?.user ?? null);
            setShowRecovery(true);
            window.history.replaceState({}, document.title, "/");
          }
          setAuthLoading(false);
        });
    } else {
      if (isRecoveryRedirect()) setShowRecovery(true);
      supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthLoading(false); });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setShowRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load exams — only those with clicks (= have actual questions)
  useEffect(() => {
    if (!supabase) { setExamsLoading(false); return; }
    supabase
      .from("exams")
      .select("id,name,initials,category,clicks,description")
      .not("clicks", "is", null)
      .order("clicks", { ascending: false })
      .then(({ data }) => {
        setExams((data ?? []) as Exam[]);
        setExamsLoading(false);
      });
  }, []);

  const list = exams.filter((e) =>
    (e.name + " " + e.initials + " " + e.category).toLowerCase().includes(q.toLowerCase())
  );

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  function openExam(e: Exam) {
    setExam(e);
    setPage("exam");
    scrollRef.current?.scrollTo({ top: 0 });
  }

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: C.polar }}>
      <Loader2 size={32} className="animate-spin" color={C.green} />
    </div>
  );

  return (
    <div style={{ fontFamily: "Nunito, system-ui, sans-serif", background: C.polar }} className="relative flex h-screen w-full flex-col overflow-hidden">
      {page === "exam" && exam ? (
        <ExamDetail exam={exam} onBack={() => setPage("home")} onUpgrade={() => setPricing(true)} user={user} onAuthRequest={() => setShowAuth(true)} />
      ) : (
        <>
          <header className="flex-none px-5 py-2.5 md:px-10" style={{ background: C.polar }}>
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
              <a href="#" className="flex items-center gap-2 outline-none">
                <span className="grid h-8 w-8 place-items-center rounded-xl text-base font-black text-white" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>D</span>
                <span className="text-lg font-extrabold" style={{ color: C.eel }}>Drnote</span>
              </a>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPricing(true)} className="rounded-2xl px-3 py-2 text-sm font-black uppercase tracking-wide" style={{ color: C.wolf }}>Pricing</button>
                {user ? (
                  <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black" style={{ background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}>
                    <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-black text-white" style={{ background: C.green }}>{user.email?.[0].toUpperCase()}</span>
                    Sign out
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowAuth(true)} className="rounded-2xl px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.green, boxShadow: `0 3px 0 ${C.greenDark}` }}>Get started</button>
                )}
              </div>
            </div>
          </header>

          <main ref={scrollRef} className="no-bar flex-1 overflow-y-auto px-5 py-8 md:px-10">
            <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black" style={{ background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}>
                <Star size={14} strokeWidth={3} fill={C.gold} color={C.gold} /> 4.9 · Loved by 40,000+ students
              </span>
              <h1 className="mt-4 text-3xl font-black leading-[1.1] sm:text-5xl" style={{ color: C.eel }}>Study smarter, pass exams,<br className="hidden sm:block" /> and achieve higher scores.</h1>
              <p className="mt-3 max-w-md font-bold" style={{ color: C.wolf }}>Real questions for every specialty. Start free in seconds.</p>
            </section>

            <div className="mx-auto mt-9 flex w-full max-w-xl items-center gap-2 rounded-2xl px-4 py-3.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
              <Search size={20} strokeWidth={3} color={C.hare} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exams…" className="w-full bg-transparent font-bold outline-none placeholder:font-bold" style={{ color: C.eel }} />
            </div>

            {examsLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin" color={C.green} /></div>
            ) : (
              <div className="mx-auto mt-4 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                {list.map((e) => { const { color, wash } = examColor(e.name); return (
                  <button key={e.id} type="button" onClick={() => openExam(e)} className="flex items-center gap-3 rounded-2xl p-4 text-left transition-transform duration-75 hover:-translate-y-0.5 active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: wash, color }}><GraduationCap size={22} strokeWidth={2.75} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-black leading-tight" style={{ color: C.eel }}>{e.name.trim()}</p>
                      <p className="text-sm font-bold" style={{ color: C.hare }}>{e.initials}</p>
                    </div>
                    <ChevronRight size={20} strokeWidth={3} color={C.hare} />
                  </button>); })}
                {list.length === 0 && <p className="col-span-full py-10 text-center font-bold" style={{ color: C.hare }}>No exams match your search.</p>}
              </div>
            )}
          </main>
        </>
      )}

      {pricing && <Pricing onClose={() => setPricing(false)} examTitle={page === "exam" && exam ? exam.name : undefined} onGetStarted={() => { setPricing(false); if (!user) setShowAuth(true); }} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={(u) => setUser(u)} />}
      {showRecovery && <SetNewPasswordModal onDone={() => setShowRecovery(false)} />}
    </div>
  );
}
