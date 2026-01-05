import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      api_key?: string;
    };

    const apiKey = String(body.api_key || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "API key is required." },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: "antworte nur mit 'ok'" }],
        temperature: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `OpenAI chat failed (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.message?.content?.[0]?.text ??
      "";
    const trimmed = String(content || "").trim();

    if (trimmed.toLowerCase() !== "ok") {
      return NextResponse.json(
        { ok: false, error: `Unerwartete Antwort: ${trimmed || "leer"}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
