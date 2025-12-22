"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import chatModels from "@/lib/chat-models.json";

type Source = {
  n: number;
  document_id: number;
  document_name: string;
  chunk_id: number;
  chunk_index: number;
  similarity: number;
  snippet: string;
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

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type MessageMetadata = {
  sources?: Source[];
  model_used?: string;
  model?: string;
  usage?: Usage | null;
};

type Msg = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  metadata?: MessageMetadata;
  created_at?: string;
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
const MODEL_BY_ID = new Map(MODEL_LIST.map((model) => [model.id, model]));

const RATE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});
const COST_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});
const TOKEN_FORMATTER = new Intl.NumberFormat("en-US");

const MODEL_OPTIONS = MODEL_LIST.map((model) => ({
  id: model.id,
  label: `${model.label} (${RATE_FORMATTER.format(
    model.pricing.input_per_1m
  )} in / ${RATE_FORMATTER.format(model.pricing.output_per_1m)} out per 1M)`,
}));

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children, node: _node, ...props }) => (
    <h1 className="mb-2 mt-4 text-xl font-semibold text-white" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, node: _node, ...props }) => (
    <h2 className="mb-2 mt-4 text-lg font-semibold text-white" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, node: _node, ...props }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-white" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, node: _node, ...props }) => (
    <p className="mb-3 text-white/90 last:mb-0" {...props}>
      {children}
    </p>
  ),
  a: ({ children, href, node: _node, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="ev-link break-words"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, node: _node, ...props }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-white/90" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, node: _node, ...props }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-white/90" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, node: _node, ...props }) => (
    <li className="text-white/90" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, node: _node, ...props }) => (
    <blockquote
      className="mb-3 border-l-2 border-white/20 pl-3 text-white/80"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-3 border-white/10" {...props} />,
  pre: ({ children, node: _node, ...props }) => (
    <pre
      className="mb-3 overflow-x-auto rounded-xl bg-black/60 p-3 text-white/90"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ inline, className, children, node: _node, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-white/90"
          {...props}
        >
          {children}
        </code>
      );
    }

    const blockClassName = className
      ? `font-mono text-xs text-white/90 ${className}`
      : "font-mono text-xs text-white/90";
    return (
      <code className={blockClassName} {...props}>
        {children}
      </code>
    );
  },
  table: ({ children, node: _node, ...props }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, node: _node, ...props }) => (
    <thead className="bg-white/5 text-white" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, node: _node, ...props }) => (
    <tbody className="text-white/90" {...props}>
      {children}
    </tbody>
  ),
  th: ({ children, node: _node, ...props }) => (
    <th className="border border-white/10 px-3 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, node: _node, ...props }) => (
    <td className="border border-white/10 px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
};

export default function ChatClient(props: {
  chatId: number;
  initialMessages: Msg[];
  initialTitle: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages ?? []);
  const [text, setText] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [lastSources, setLastSources] = useState<Source[] | null>(null);
  const [title, setTitle] = useState(props.initialTitle || "New chat");
  const [titleDraft, setTitleDraft] = useState(props.initialTitle || "New chat");
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const nextTitle = props.initialTitle || "New chat";
    setTitle(nextTitle);
    setTitleDraft(nextTitle);
  }, [props.initialTitle]);

  const canSend = useMemo(() => text.trim().length > 0 && !busy, [text, busy]);
  const totals = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const usage = message.metadata?.usage;
      const promptTokens = Number(usage?.prompt_tokens ?? 0);
      const completionTokens = Number(usage?.completion_tokens ?? 0);

      if (promptTokens || completionTokens) {
        inputTokens += promptTokens;
        outputTokens += completionTokens;

        const modelId = String(
          message.metadata?.model_used || message.metadata?.model || ""
        );
        const pricing = MODEL_BY_ID.get(modelId);
        if (pricing) {
          cost += (promptTokens / 1_000_000) * pricing.pricing.input_per_1m;
          cost += (completionTokens / 1_000_000) * pricing.pricing.output_per_1m;
        }
      }
    }

    return { inputTokens, outputTokens, cost };
  }, [messages]);
  const currentModel = MODEL_BY_ID.get(model);

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(title);
      setTitleError("Title cannot be empty.");
      return;
    }
    if (trimmed === title || titleSaving) {
      setTitleDraft(trimmed);
      setTitleError(null);
      return;
    }

    setTitleSaving(true);
    setTitleError(null);

    try {
      const res = await fetch("/api/chat/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: props.chatId, title: trimmed }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        const err = json?.error || "Update failed";
        setTitleError(String(err));
        return;
      }

      setTitle(trimmed);
      setTitleDraft(trimmed);
      router.refresh();
    } catch (e) {
      const err = e instanceof Error ? e.message : "Update failed";
      setTitleError(err);
    } finally {
      setTitleSaving(false);
    }
  }

  async function send() {
    const msg = text.trim();
    if (!msg || busy) return;

    setBusy(true);
    setText("");
    setLastSources(null);

    const optimisticUser: Msg = { role: "user", content: msg };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: props.chatId,
          message: msg,
          model,
          top_k: 6,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        const err = json?.error || "Request failed";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Fehler: ${err}` },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.answer,
          metadata: {
            sources: json.sources,
            model_used: json.model,
            usage: json.usage,
          },
        },
      ]);

      setLastSources(json.sources ?? null);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Fehler: ${err}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          <span className="text-xs uppercase tracking-widest text-white/40">
            Title
          </span>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setTitleDraft(title);
                setTitleError(null);
              }
            }}
            maxLength={120}
            className="w-40 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white sm:w-60"
          />
          <button
            type="button"
            onClick={saveTitle}
            disabled={
              titleSaving || !titleDraft.trim() || titleDraft.trim() === title
            }
            className="ev-button px-3 py-2 text-xs"
          >
            {titleSaving ? "Saving..." : "Save"}
          </button>
          <span className="text-xs text-white/40">#{props.chatId}</span>
        </div>

        <label className="flex items-center gap-2 text-sm text-white/70">
          <span>Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {titleError ? (
        <div className="mt-2 text-xs text-rose-300">{titleError}</div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
        <span>Input tokens: {TOKEN_FORMATTER.format(totals.inputTokens)}</span>
        <span>Output tokens: {TOKEN_FORMATTER.format(totals.outputTokens)}</span>
        <span>Cost: {COST_FORMATTER.format(totals.cost)}</span>
        {currentModel ? (
          <span>
            Model pricing: {RATE_FORMATTER.format(currentModel.pricing.input_per_1m)}{" "}
            in / {RATE_FORMATTER.format(currentModel.pricing.output_per_1m)} out
            per 1M
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex-1 overflow-auto pr-2">
        <div className="grid gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={[
                "rounded-2xl border p-3",
                m.role === "user"
                  ? "border-white/10 bg-white/5"
                  : "border-white/10 bg-black/40",
              ].join(" ")}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-white/50">
                {m.role}
              </div>
              {m.role === "assistant" ? (
                <div className="mt-2 text-white/90">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MARKDOWN_COMPONENTS}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="mt-2 whitespace-pre-wrap text-white/90">
                  {m.content}
                </div>
              )}

              {m.role === "assistant" && m.metadata?.sources?.length ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    Quellen
                  </div>
                  <div className="mt-2 grid gap-2">
                    {(m.metadata.sources as Source[]).map((s) => (
                      <div
                        key={s.n}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-white">
                            [{s.n}] {s.document_name}
                          </div>
                          <div className="text-xs text-white/50">
                            sim {Number(s.similarity).toFixed(3)} - doc {s.document_id} - chunk {s.chunk_index}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-white/80">
                          {s.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Frage stellen..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white placeholder:text-white/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={busy}
        />

        <button
          onClick={send}
          disabled={!canSend}
          className="ev-button-accent"
        >
          {busy ? "..." : "Send"}
        </button>
      </div>

      {lastSources && lastSources.length === 0 ? (
        <div className="mt-3 text-xs text-white/50">
          Keine Quellen gefunden. Antwort sollte dann "Nicht in der Wissensbasis" sein.
        </div>
      ) : null}
    </div>
  );
}
