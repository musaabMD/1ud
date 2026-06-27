interface Env {
  ANTHROPIC_API_KEY?: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const payload = (await request.json().catch(() => null)) as
    | { examTitle?: string; examRole?: string; messages?: { role: "user" | "assistant"; content: string }[] }
    | null;

  const messages = (payload?.messages ?? []).filter((message) => message.role === "user" || message.role === "assistant");
  if (!messages.length) return Response.json({ error: "No messages provided." }, { status: 400 });

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        reply:
          "AI is ready in the app, but the production ANTHROPIC_API_KEY is not configured yet. Add it in Cloudflare Pages environment variables.",
      },
      { status: 200 },
    );
  }

  const anthropicMessages = messages.map((message) => ({
    role: message.role,
    content: message.content.slice(0, 4000),
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 900,
      system: `You are Drnote's medical exam study assistant for ${payload?.examTitle ?? "a medical exam"} (${payload?.examRole ?? "student"}). Be concise, accurate, and explain why the answer matters for exam prep.`,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json({ error: "AI request failed.", detail: detail.slice(0, 500) }, { status: 502 });
  }

  const data = (await response.json()) as { content?: { type: string; text?: string }[] };
  const reply = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  return Response.json({ reply: reply || "I could not produce an answer. Try rephrasing the question." });
};
