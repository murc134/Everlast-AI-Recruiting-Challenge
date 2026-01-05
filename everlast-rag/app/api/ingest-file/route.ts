import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunking";
import { embedTexts, resolveOpenAiKey } from "@/lib/openai";
import { toErrorMessage } from "@/lib/errors";
import pdfParse from "pdf-parse";

const supportedMimeTypes: Record<string, "text" | "pdf"> = {
  "text/plain": "text",
  "text/markdown": "text",
  "text/x-markdown": "text",
  "application/pdf": "pdf",
};

type ProfileRow = {
  openai_api_key: string | null;
};

async function extractPdfText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = await pdfParse(Buffer.from(arrayBuffer));
  return pdfData.text.trim();
}

function errorResponse(stage: string, error: unknown, status = 500) {
  const message = toErrorMessage(error, "Unknown error");
  return NextResponse.json(
    { ok: false, error: `${stage}: ${message}`, stage },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.message !== "Auth session missing!") {
      return errorResponse("auth", userError, 500);
    }
    if (!user) {
      return errorResponse("auth", "Unauthorized", 401);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return errorResponse("parse_form", error, 400);
    }
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("validate_file", "No file uploaded", 400);
    }

    const fileKind = supportedMimeTypes[file.type];
    if (!fileKind) {
      return errorResponse(
        "validate_file",
        "Unsupported file type. Allowed: .txt, .md, .pdf.",
        400
      );
    }

    if (file.size > 1024 * 1024) {
      return errorResponse("validate_file", "File too large (max 1MB)", 400);
    }

    let raw_text = "";
    try {
      raw_text =
        fileKind === "pdf" ? await extractPdfText(file) : (await file.text()).trim();
    } catch (error) {
      const message = toErrorMessage(error, "File read failed");
      return errorResponse("read_file", message, 400);
    }
    if (!raw_text) {
      return errorResponse("read_file", "File is empty", 400);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("openai_api_key")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return errorResponse("profile_lookup", profileError, 500);
    }

    const apiKey = resolveOpenAiKey(profile?.openai_api_key);
    if (!apiKey) {
      return errorResponse(
        "profile_lookup",
        "Missing OpenAI API key. Set it in /settings or via CHATGPT_API_KEY.",
        400
      );
    }

    const { data: doc, error: docError } = await supabase
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
      .single<{ id: number }>();

    if (docError || !doc) {
      return errorResponse("document_insert", docError ?? "Document insert failed", 500);
    }

    const chunks = chunkText(raw_text, 900);
    if (chunks.length === 0) {
      await supabase
        .from("documents")
        .update({ ingestion_status: "failed", ingestion_error: "No chunks produced" })
        .eq("id", doc.id);
      return errorResponse("chunking", "No chunks produced", 400);
    }

    let embeddings: number[][];
    try {
      embeddings = await embedTexts({
        apiKey,
        model: "text-embedding-3-small",
        input: chunks.map((c) => c.content),
      });
    } catch (error) {
      const message = toErrorMessage(error, "Embedding failed");
      await supabase
        .from("documents")
        .update({ ingestion_status: "failed", ingestion_error: message })
        .eq("id", doc.id);
      return errorResponse("embedding", message, 500);
    }

    if (embeddings.length !== chunks.length) {
      await supabase
        .from("documents")
        .update({
          ingestion_status: "failed",
          ingestion_error: "Embedding count mismatch",
        })
        .eq("id", doc.id);
      return errorResponse("embedding", "Embedding count mismatch", 500);
    }

    const { error: chunkInsertError } = await supabase
      .from("document_chunks")
      .insert(
        chunks.map((c, i) => ({
          owner_id: user.id,
          document_id: doc.id,
          chunk_index: c.index,
          content: c.content,
          embedding: embeddings[i],
        }))
      );

    if (chunkInsertError) {
      await supabase
        .from("documents")
        .update({
          ingestion_status: "failed",
          ingestion_error: chunkInsertError.message,
        })
        .eq("id", doc.id);
      return errorResponse("chunk_insert", chunkInsertError, 500);
    }

    const { error: docUpdateError } = await supabase
      .from("documents")
      .update({ ingestion_status: "processed", ingestion_error: null })
      .eq("id", doc.id);

    if (docUpdateError) {
      return errorResponse("document_update", docUpdateError, 500);
    }

    return NextResponse.json({
      ok: true,
      document_id: doc.id,
      chunks: chunks.length,
    });
  } catch (error) {
    return errorResponse("unhandled", error, 500);
  }
}
