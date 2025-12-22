import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedTexts } from "@/lib/openai";
import chatModels from "@/lib/chat-models.json";

type ProfileRow = { openai_api_key: string | null; system_prompt: string | null };

type ChatBody = {
  chat_id?: number;
  message?: string;
  model?: string;
  top_k?: number;
};

type MatchChunkRow = {
  chunk_id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  similarity: number;
};

type DocumentRow = {
  id: number;
  document_name: string;
};

type PricingModel = {
  id: string;
  label: string;
  pricing: {
    input_per_1m: number;
    cached_input_per_1m: number | null;
    output_per_1m: number;
  };
};

type ChatCompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

function getCheapestModelId(models: PricingModel[], fallback: string) {
  let cheapest: PricingModel | undefined;
  let cheapestCost = Number.POSITIVE_INFINITY;

  for (const model of models) {
    const pricing = model?.pricing;
    if (!pricing) continue;
    const cost = Number(pricing.input_per_1m) + Number(pricing.output_per_1m);
    if (!Number.isFinite(cost)) continue;
    if (cost < cheapestCost) {
      cheapestCost = cost;
      cheapest = model;
    }
  }

  return cheapest?.id ?? fallback;
}

const MODEL_LIST = (chatModels.models as PricingModel[]).filter((m) => m?.id);
const DEFAULT_MODEL = getCheapestModelId(MODEL_LIST, "gpt-5.2");
const ALLOWED_MODELS = new Set(MODEL_LIST.map((m) => m.id));
const DEFAULT_SYSTEM_PROMPT = [
  "Du bist ein RAG-Assistent.",
  "Nutze ausschliesslich den bereitgestellten KONTEXT um zu antworten.",
  "Wenn der Kontext nicht ausreicht, sage klar: 'Nicht in der Wissensbasis'.",
  "Gib am Ende eine Quellenliste im Format [1], [2], ... passend zu den verwendeten Textstellen.",
].join("\n");

function pickModel(input: string | undefined) {
  const m = String(input || "").trim();
  if (!m) return DEFAULT_MODEL;
  if (ALLOWED_MODELS.has(m)) return m;
  return DEFAULT_MODEL;
}

async function callOpenAIChat(options: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI chat failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const content =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.message?.content?.[0]?.text ??
    "";

  const usage: ChatCompletionUsage | null = json?.usage
    ? {
        prompt_tokens: Number(json.usage.prompt_tokens ?? 0),
        completion_tokens: Number(json.usage.completion_tokens ?? 0),
        total_tokens: Number(json.usage.total_tokens ?? 0),
      }
    : null;

  return { content: String(content || "").trim(), usage };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.message !== "Auth session missing!") {
      return NextResponse.json(
        { ok: false, error: userError.message },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ChatBody;
    const chatId = Number(body.chat_id);
    const message = String(body.message || "").trim();
    const topK = Math.max(1, Math.min(10, Number(body.top_k ?? 6)));
    const model = pickModel(body.model);

    if (!Number.isFinite(chatId)) {
      return NextResponse.json({ ok: false, error: "chat_id is required" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
    }

    // Sicherheitscheck: gehört dieser Chat dem User?
    const { data: chatRow, error: chatError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", chatId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: number }>();

    if (chatError) {
      return NextResponse.json({ ok: false, error: chatError.message }, { status: 500 });
    }
    if (!chatRow) {
      return NextResponse.json({ ok: false, error: "Chat not found" }, { status: 404 });
    }

    // OpenAI Key
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("openai_api_key, system_prompt")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    const apiKey = (profile?.openai_api_key ?? "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OpenAI API key. Set it in /settings." },
        { status: 400 }
      );
    }

    // 1) Persist user message
    const { error: msgInsertError } = await supabase.from("messages").insert({
      chat_id: chatId,
      owner_id: user.id,
      role: "user",
      content: message,
      metadata: { model_requested: model },
    });

    if (msgInsertError) {
      return NextResponse.json({ ok: false, error: msgInsertError.message }, { status: 500 });
    }

    // 2) Embed query
    const [queryEmbedding] = await embedTexts({
      apiKey,
      model: "text-embedding-3-small",
      input: [message],
    });

    // 3) Retrieve via RPC match_chunks
    const { data: chunks, error: rpcError } = await supabase
      .rpc("match_chunks", { query_embedding: queryEmbedding, match_count: topK })
      .returns<MatchChunkRow[]>();

    if (rpcError) {
      return NextResponse.json({ ok: false, error: rpcError.message }, { status: 500 });
    }

    if (chunks && !Array.isArray(chunks)) {
      const errorMessage =
        "Error" in chunks ? chunks.Error : "match_chunks returned an unexpected payload";
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
    }

    const safeChunks = (Array.isArray(chunks) ? chunks : []).filter(Boolean);

    // 4) Map document names for citations
    const docIds = Array.from(new Set(safeChunks.map((c) => c.document_id)));
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id, document_name")
      .in("id", docIds)
      .returns<DocumentRow[]>();

    if (docsError) {
      return NextResponse.json({ ok: false, error: docsError.message }, { status: 500 });
    }

    const docNameById = new Map<number, string>();
    (docs ?? []).forEach((d) => docNameById.set(d.id, d.document_name));

    // 5) Prompt bauen
    const sources = safeChunks.map((c, idx) => {
      const n = idx + 1;
      const docName = docNameById.get(c.document_id) ?? `Dokument ${c.document_id}`;
      return {
        n,
        chunk_id: c.chunk_id,
        document_id: c.document_id,
        document_name: docName,
        chunk_index: c.chunk_index,
        similarity: c.similarity,
        snippet: c.content.slice(0, 400),
        content: c.content,
      };
    });

    const contextBlock =
      sources.length === 0
        ? ""
        : sources
            .map(
              (s) =>
                `[${s.n}] ${s.document_name} (doc:${s.document_id}, chunk:${s.chunk_index}, sim:${s.similarity.toFixed(
                  3
                )})\n${s.content}`
            )
            .join("\n\n---\n\n");

    const storedPrompt = String(profile?.system_prompt ?? "").trim();
    const basePrompt = storedPrompt || DEFAULT_SYSTEM_PROMPT;
    const systemParts = [basePrompt];
    if (contextBlock.trim()) {
      systemParts.push("", "KONTEXT:", contextBlock);
    }
    const system = systemParts.join("\n");

    const { content: answer, usage } = await callOpenAIChat({
      apiKey,
      model,
      system,
      user: message,
    });

    // 6) Persist assistant message inkl Quellen-Metadata
    const assistantMetadata = {
      model_used: model,
      top_k: topK,
      usage,
      sources: sources.map((s) => ({
        n: s.n,
        document_id: s.document_id,
        document_name: s.document_name,
        chunk_id: s.chunk_id,
        chunk_index: s.chunk_index,
        similarity: s.similarity,
        snippet: s.snippet,
      })),
    };

    const { error: assistantInsertError } = await supabase.from("messages").insert({
      chat_id: chatId,
      owner_id: user.id,
      role: "assistant",
      content: answer || "Nicht in der Wissensbasis.",
      metadata: assistantMetadata,
    });

    if (assistantInsertError) {
      return NextResponse.json(
        { ok: false, error: assistantInsertError.message },
        { status: 500 }
      );
    }

    // update chat updated_at (optional, aber nice)
    await supabase.from("chat_sessions").update({}).eq("id", chatId);

    return NextResponse.json({
      ok: true,
      chat_id: chatId,
      model: model,
      answer: answer || "Nicht in der Wissensbasis.",
      sources: assistantMetadata.sources,
      usage,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
