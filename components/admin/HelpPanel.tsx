"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HelpCircle, ArrowRight, Send, X } from "lucide-react";

/**
 * Ask-a-question help, in a slide-over.
 *
 * Exists because the app's navigation moves faster than anyone's memory of it:
 * the project page went from fourteen peer tabs to five groups on 2026-08-21,
 * and two "where is this?" support questions landed the following morning.
 *
 * Answers come from /api/admin/help, which is given a map of the app's own
 * navigation and told to answer only from it. It has no access to project
 * data — this explains the app, it does not report on the job.
 *
 * When an answer ends in a `LINK:` line the panel turns it into a button, so
 * the reply is one click from being done rather than a set of directions to
 * follow. That is the whole reason it beats a help document.
 */

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Where do I record a payment to a sub?",
  "How do I log fuel and equipment rentals?",
  "What's the difference between a cash job and a financed job?",
  "How do I request a draw?",
];

/** Answers end with `LINK: /some/path`; split it off so it can be a button. */
function splitLink(text: string): { body: string; link: string | null } {
  const match = text.match(/\n?LINK:\s*(\/[^\s]*)\s*$/);
  if (!match) return { body: text, link: null };
  return { body: text.slice(0, match.index).trimEnd(), link: match[1] };
}

export function HelpPanel() {
  const router = useRouter();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only used to build a deep link back into the project they're already on.
  const projectId =
    typeof params?.id === "string" && params.id.length === 36 ? params.id : null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      // History is captured before the new turn so the request carries the
      // conversation as it was, not including the question being asked.
      const history = turns.slice(-8);
      setTurns((t) => [...t, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
      setQuestion("");
      setStreaming(true);

      try {
        const res = await fetch("/api/admin/help", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed, projectId, history }),
        });

        if (!res.ok || !res.body) {
          const msg =
            (await res.json().catch(() => null))?.error ??
            "Couldn't reach the help assistant.";
          setTurns((t) => {
            const next = [...t];
            next[next.length - 1] = { role: "assistant", content: msg };
            return next;
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setTurns((t) => {
            const next = [...t];
            next[next.length - 1] = { role: "assistant", content: answer };
            return next;
          });
        }
      } catch {
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = {
            role: "assistant",
            content: "Couldn't reach the help assistant. Check your connection and try again.",
          };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [projectId, streaming, turns],
  );

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open help"
          title="Help (Ctrl+/)"
          className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-105 cursor-pointer md:bottom-6 md:right-6"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label="Help"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-gray-700" />
                <span className="text-sm font-semibold text-gray-900">Help</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {turns.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-600">
                    Ask how to do something in this app and you&apos;ll get the steps —
                    plus a button straight to the right screen.
                  </p>
                  <div className="mt-4 space-y-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn, i) =>
                  turn.role === "user" ? (
                    <p
                      key={i}
                      className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-black px-3.5 py-2 text-sm text-white"
                    >
                      {turn.content}
                    </p>
                  ) : (
                    <AssistantTurn
                      key={i}
                      content={turn.content}
                      pending={streaming && i === turns.length - 1}
                      onNavigate={(href) => {
                        setOpen(false);
                        router.push(href);
                      }}
                    />
                  ),
                )
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
              className="flex items-center gap-2 border-t border-gray-200 px-4 py-3"
            >
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="How do I…?"
                className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                disabled={streaming || !question.trim()}
                aria-label="Send question"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-black text-white transition-colors hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}

function AssistantTurn({
  content,
  pending,
  onNavigate,
}: {
  content: string;
  pending: boolean;
  onNavigate: (href: string) => void;
}) {
  const { body, link } = splitLink(content);

  if (!body && pending) {
    return (
      <p className="text-sm text-gray-400" aria-live="polite">
        Thinking…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {body}
      </div>
      {/* Held back until the stream finishes — a link parsed from a partial
          response can point somewhere half-written. */}
      {link && !pending && (
        <button
          onClick={() => onNavigate(link)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 cursor-pointer"
        >
          Take me there <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
