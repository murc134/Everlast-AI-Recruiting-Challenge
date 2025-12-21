import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunking";
import { embedTexts } from "@/lib/openai";
import pdfParse from "pdf-parse";

const supportedMimeTypes: Record<string, "text" | "pdf"> = {
  "text/plain": "text",
  "text/markdown": "text",
  "text/x-markdown": "text",
  "application/pdf": "pdf",
};

async function extractPdfText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = await pdfParse(Buffer.from(arrayBuffer));
  return pdfData.text.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.message !== "Auth session missing!") {
    return NextResponse.json({ ok: false, error: userError.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
  }

  const fileKind = supportedMimeTypes[file.type];
  if (!fileKind) {
    return NextResponse.json(
      { ok: false, error: "Dateiformat nicht unterstuetzt. Nur .txt, .md, .pdf." },
      { status: 400 }
    );
  }

  if (file.size > 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large (max 1MB)" }, { status: 400 });
  }

  let raw_text = "";
  try {
    raw_text =
      fileKind === "pdf" ? await extractPdfText(file) : (await file.text()).trim();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Datei konnte nicht gelesen werden.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
  if (!raw_text) {
    return NextResponse.json({ ok: false, error: "File is empty" }, { status: 400 });
  }

  // OpenAI Key holen
  const { data: profile } = await supabase
    .from("profiles")
    .select("openai_api_key")
    .eq("id", user.id)
    .maybeSingle();

  const apiKey = (profile?.openai_api_key ?? "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing OpenAI API key" },
      { status: 400 }
    );
  }

  // Document anlegen
  const { data: doc } = await supabase
    .from("documents")
    .insert({
      owner_id: user.id,
      document_name: file.name,
      source: "upload",
      document_type: "text",
      raw_text,
      ingestion_status: "processing",
    })
    .select("id")
    .single();

  const chunks = chunkText(raw_text, 900);
  const embeddings = await embedTexts({
    apiKey,
    input: chunks.map(c => c.content),
  });

  await supabase.from("document_chunks").insert(
    chunks.map((c, i) => ({
      owner_id: user.id,
      document_id: doc.id,
      chunk_index: c.index,
      content: c.content,
      embedding: embeddings[i],
    }))
  );

  await supabase
    .from("documents")
    .update({ ingestion_status: "processed" })
    .eq("id", doc.id);

  return NextResponse.json({
    ok: true,
    document_id: doc.id,
    chunks: chunks.length,
  });
}
