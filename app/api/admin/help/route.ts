import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { helpSystemPrompt } from "@/lib/help/prompt";
import { getRoleLabel } from "@/lib/roles";

/**
 * The in-app help assistant.
 *
 * Answers "how do I…" about this app and nothing else. It is given a map of
 * the app's own navigation (lib/help/app-map.ts) and told to answer only from
 * it — it has no access to project data, and deliberately so: the question it
 * exists to answer is "where do I record a tank of fuel", not "what did we
 * spend on Niki Miles". Keeping data out means no RLS surface to get wrong.
 *
 * Staff only. requireAdmin default-denies contractor logins, which is what we
 * want here — the app map describes panels a contractor cannot reach.
 */

/** Roughly 700 tokens of answer. Long enough for a numbered walkthrough. */
const MAX_TOKENS = 1024;

const MAX_QUESTION_CHARS = 1000;
/** Keep the cached prefix cheap: the map dominates, history should not. */
const MAX_HISTORY_TURNS = 8;

interface HelpTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { profile } = gate;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Help assistant is not configured." },
      { status: 503 },
    );
  }

  let body: { question?: unknown; projectId?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json(
      { error: "That question is too long — try a shorter one." },
      { status: 400 },
    );
  }

  // Only used to fill {projectId} in a deep link, never to look anything up.
  const projectId =
    typeof body.projectId === "string" && /^[0-9a-f-]{36}$/i.test(body.projectId)
      ? body.projectId
      : null;

  const history: HelpTurn[] = Array.isArray(body.history)
    ? (body.history as unknown[])
        .filter((t): t is HelpTurn => {
          if (!t || typeof t !== "object") return false;
          const turn = t as Record<string, unknown>;
          return (
            (turn.role === "user" || turn.role === "assistant") &&
            typeof turn.content === "string"
          );
        })
        .slice(-MAX_HISTORY_TURNS)
    : [];

  const context = [
    `The person asking is signed in as ${getRoleLabel(profile.role)}.`,
    projectId
      ? `They are currently looking at the project with id ${projectId}. Use that id for {projectId} in any link.`
      : `They are not on a specific project page right now.`,
  ].join(" ");

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: `${context}\n\nQuestion: ${question}` },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = client.messages.stream({
          model: "claude-opus-5",
          max_tokens: MAX_TOKENS,
          // Low effort: this is lookup-and-paraphrase against a map that is
          // already in context, not a reasoning problem. Higher effort spends
          // tokens and seconds without making "click Money then Payments"
          // any more correct.
          output_config: { effort: "low" },
          system: [
            {
              type: "text",
              text: helpSystemPrompt(),
              // The map is identical on every request and every user, so an
              // hour-long cache turns the bulk of each question into a cache
              // read. Verify with usage.cache_read_input_tokens if answers
              // ever start costing more than expected.
              cache_control: { type: "ephemeral", ttl: "1h" },
            },
          ],
          messages,
        });

        for await (const event of run) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await run.finalMessage();
      } catch (err) {
        console.error("Help assistant failed", err);
        // The stream may already be partway through an answer, so this is
        // appended rather than returned as a status code.
        controller.enqueue(
          encoder.encode("\n\nSomething went wrong answering that. Try again."),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
