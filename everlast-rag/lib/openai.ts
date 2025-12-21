export type OpenAIEmbedResponse = {
  data: Array<{ embedding: number[] }>;
};

export async function embedTexts(options: {
  apiKey: string;
  model?: string; // default: text-embedding-3-small
  input: string[];
}) {
  const { apiKey, input } = options;
  const model = options.model ?? "text-embedding-3-small";

  if (!apiKey || !apiKey.trim()) {
    throw new Error("Missing OpenAI apiKey");
  }
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("embedTexts: input must be a non-empty array");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as OpenAIEmbedResponse;

  if (!json?.data?.length || json.data.length !== input.length) {
    throw new Error("OpenAI embeddings response malformed");
  }

  return json.data.map((d) => d.embedding);
}
