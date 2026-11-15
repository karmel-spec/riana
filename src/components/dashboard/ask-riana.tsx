"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askRiana, rianaThread } from "@/app/actions/riana";
import { fmtDate, fmtTime } from "@/lib/format";
import type { RianaQuestion } from "@/lib/types";
import { Sparkle } from "@/components/icons";

const POLL_MS = 4000;
/** Stop checking after about ten minutes; the answer still shows the next time the page opens. */
const MAX_POLLS = 150;

const NAMES: Record<RianaQuestion["asker"], string> = { rich: "Rich", diana: "Diana", karmel: "Karmel", heather: "Heather" };
const CHANNELS: Record<RianaQuestion["channel"], string> = { web: "Web chat", sms: "Text", email: "Email" };
const when = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;

type Props = {
  /** The thread as the server saw it. */
  initial: RianaQuestion[];
  /** False until the riana_questions migration is applied. */
  ready: boolean;
  role: "parent" | "super_admin";
  /** The signed-in parent, so "Who is asking" starts on them. */
  defaultAsker: "rich" | "diana" | null;
  /** Brief view: larger type and buttons. */
  big?: boolean;
  /** Admin view: show how each message arrived. */
  showChannel?: boolean;
  /** Extra line for admins when the chat is not ready. */
  notReadyDetail?: string;
};

/**
 * Ask Riana: the family's chat with Riana. Family messages sit on the right,
 * Riana's answers on the left. While a message waits, the thread is re-read
 * every few seconds so her answer appears without reloading the page.
 */
export function AskRiana({ initial, ready, role, defaultAsker, big = false, showChannel = false, notReadyDetail }: Props) {
  const [questions, setQuestions] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) { setSeen(initial); setQuestions(initial); }

  const [body, setBody] = useState("");
  const [intent, setIntent] = useState<"question" | "teach">("question");
  const [asker, setAsker] = useState<"rich" | "diana" | null>(defaultAsker);
  const [behalf, setBehalf] = useState<"" | "rich" | "diana">("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [polls, setPolls] = useState(0);
  const log = useRef<HTMLDivElement>(null);

  const waiting = questions.some((q) => q.status === "waiting");
  const polling = ready && waiting && polls < MAX_POLLS;

  useEffect(() => {
    if (!polling) return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      setPolls((n) => n + 1);
      try {
        const r = await rianaThread();
        if (!stopped && r.ok) setQuestions(r.questions);
      } catch { /* offline or signed out: try again on the next tick */ }
    }, POLL_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [polling]);

  // Keep the newest message in view.
  const last = questions.at(-1);
  const marker = `${questions.length}:${last?.id ?? ""}:${last?.status ?? ""}`;
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [marker]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 3) { setError("Please write a little more."); return; }
    if (role === "parent" && !asker) { setError("Please choose who is asking: Rich or Diana."); return; }
    setError(null);
    startSending(async () => {
      try {
        const r = await askRiana({ intent, body: text, asker: role === "parent" ? asker ?? undefined : undefined, onBehalfOf: role === "super_admin" && behalf ? behalf : null });
        if (!r.ok) { setError(r.error); return; }
        setQuestions(r.questions);
        setBody("");
        setPolls(0);
      } catch {
        setError("The message could not be sent. Please check the internet connection and try again.");
      }
    });
  }

  // The global 44px minimum wins over min-height utilities, so the larger Brief targets come from padding.
  const tap = big ? "py-[12px] text-[1.05rem]" : "py-2";
  const choice = (on: boolean) => `${tap} flex-1 rounded-xl border px-4 font-semibold ${on ? "border-evergreen bg-evergreen text-paper" : "border-rule bg-paper text-ink hover:bg-paper-warm"}`;

  return (
    <section aria-labelledby="ask-riana" className={`card flex min-w-0 flex-col gap-4 ${big ? "mb-6" : ""}`}>
      <div>
        <h2 id="ask-riana" className={`font-semibold leading-tight ${big ? "text-[1.6rem]" : "text-[1.35rem]"}`}>Ask Riana or tell Riana something</h2>
        <p className="text-ink-soft">{showChannel ? "Everything the family has asked Riana, and her answers. Answers are shown here only; they never change the binder." : "Type a question or something new. Her answer shows up here, usually within a minute."}</p>
      </div>

      {!ready ? (
        <div className="rounded-xl border border-dashed border-rule px-4 py-4 text-ink-soft">
          <p>The chat with Riana is not switched on yet. You can still email her.</p>
          {notReadyDetail && <p className="mt-2 text-[0.9rem]">{notReadyDetail}</p>}
        </div>
      ) : (
        <>
          <div ref={log} role="log" aria-live="polite" aria-label="Conversation with Riana" tabIndex={0}
            className="flex max-h-[60vh] min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden rounded-xl border border-rule-soft bg-paper-warm/50 p-3 sm:p-4">
            {questions.length === 0 && <p className="py-6 text-center text-ink-soft">Nothing yet. Ask Riana a question, tell her something new, or email her.</p>}
            {questions.map((q) => (
              <div key={q.id} className="flex min-w-0 flex-col gap-2">
                <div className="ml-auto flex max-w-[88%] min-w-0 flex-col items-end">
                  <div className="mb-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[0.85rem] text-ink-soft">
                    <span><strong className="text-ink">{NAMES[q.asker]}</strong>{q.on_behalf_of ? ` for ${NAMES[q.on_behalf_of]}` : ""} · {when(q.created_at)}</span>
                    {q.intent === "teach" && <span className="pill bg-brass-tint text-brass-deep">Something new</span>}
                    {showChannel && <span className="pill bg-slate-tint text-slate">{CHANNELS[q.channel]} · Q-{q.public_id}</span>}
                  </div>
                  <p className="max-w-full whitespace-pre-line break-words rounded-2xl rounded-br-md bg-evergreen px-4 py-3 text-paper [overflow-wrap:anywhere]">{q.body}</p>
                </div>
                <div className="mr-auto flex max-w-[88%] min-w-0 items-start gap-2">
                  <div aria-hidden className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum-tint text-plum"><Sparkle size={20} /></div>
                  <div className="min-w-0">
                    <div className="mb-1 text-[0.85rem] text-ink-soft"><strong className="text-plum">Riana</strong>{q.answered_at ? ` · ${when(q.answered_at)}` : ""}</div>
                    {q.status === "answered" && q.answer ? (
                      <p className="max-w-full whitespace-pre-line break-words rounded-2xl rounded-bl-md border border-rule bg-paper px-4 py-3 [overflow-wrap:anywhere]">{q.answer}</p>
                    ) : polling ? (
                      <p className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-rule bg-paper px-4 py-3 text-ink-soft">
                        <span aria-hidden className="flex gap-1">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-plum" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-plum [animation-delay:200ms]" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-plum [animation-delay:400ms]" />
                        </span>
                        Riana is typing…
                      </p>
                    ) : (
                      <p className="rounded-2xl rounded-bl-md border border-dashed border-rule bg-paper px-4 py-3 text-ink-soft">Riana has your message and will answer a little later.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex min-w-0 flex-col gap-3">
            <div role="group" aria-label="What would you like to do?" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={intent === "question"} onClick={() => setIntent("question")} className={choice(intent === "question")}>Ask a question</button>
              <button type="button" aria-pressed={intent === "teach"} onClick={() => setIntent("teach")} className={choice(intent === "teach")}>Tell Riana something new</button>
            </div>
            <div>
              <label htmlFor="ask-riana-text" className="label">{intent === "teach" ? "What should Riana know?" : "Your question"}</label>
              <textarea id="ask-riana-text" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} required
                className={`field ${big ? "text-[1.1rem]" : ""}`}
                placeholder={intent === "teach" ? "For example: The dentist moved to a new office on Main Street." : "For example: When is my next doctor appointment?"} />
              {intent === "teach" && <p className="mt-1 text-[0.9rem] text-ink-soft">Karmel or Heather will look at this before anything in the binder changes.</p>}
            </div>
            {role === "parent" ? (
              <div role="group" aria-label="Who is asking?" className="flex flex-wrap items-center gap-2">
                <span className="w-full font-semibold text-ink-soft sm:w-auto sm:pr-2">Who is asking?</span>
                <button type="button" aria-pressed={asker === "rich"} onClick={() => setAsker("rich")} className={choice(asker === "rich")}>Rich</button>
                <button type="button" aria-pressed={asker === "diana"} onClick={() => setAsker("diana")} className={choice(asker === "diana")}>Diana</button>
              </div>
            ) : (
              <div>
                <label htmlFor="ask-riana-behalf" className="label">On behalf of (optional)</label>
                <select id="ask-riana-behalf" value={behalf} onChange={(e) => setBehalf(e.target.value as "" | "rich" | "diana")} className="field">
                  <option value="">Just me</option>
                  <option value="rich">Rich</option>
                  <option value="diana">Diana</option>
                </select>
              </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-ember-tint px-4 py-3 font-semibold text-ember">{error}</p>}
            <button type="submit" disabled={sending} className={`btn-primary ${big ? "py-[12px] text-[1.25rem]" : "py-2.5"} disabled:opacity-60`}>{sending ? "Sending…" : "Send"}</button>
            <p className="text-[0.9rem] text-ink-soft">Please don’t type passwords, Social Security numbers, or full account numbers. Those stay in the password vault.</p>
          </form>
        </>
      )}
    </section>
  );
}
