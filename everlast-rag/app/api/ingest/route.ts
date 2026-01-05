import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunking";
import { embedTexts, resolveOpenAiKey } from "@/lib/openai";

type IngestBody = {
  document_name?: string;
  raw_text?: string;
};

type ProfileRow = {
  openai_api_key: string | null;
};

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

    const body = (await request.json().catch(() => ({}))) as IngestBody;
    const document_name = String(body.document_name || "").trim() || "Untitled";
    const raw_text = String(body.raw_text || "").trim();

    if (!raw_text) {
      return NextResponse.json(
        { ok: false, error: "raw_text is required" },
        { status: 400 }
      );
    }

    // Profil holen -> OpenAI Key serverseitig
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("openai_api_key")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }

    const apiKey = resolveOpenAiKey(profile?.openai_api_key);
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OpenAI API key. Set it in /settings or via CHATGPT_API_KEY." },
        { status: 400 }
      );
    }

    // 1) documents insert (source sollte bei Textarea = paste sein)
    const { data: docRow, error: docInsertError } = await supabase
      .from("documents")
      .insert({
        owner_id: user.id,
        document_name,
        source: "paste",
        document_type: "text",
        raw_text,
        ingestion_status: "processing",
      })
      .select("id")
      .single<{ id: number }>();

    if (docInsertError) {
      return NextResponse.json(
        { ok: false, error: docInsertError.message },
        { status: 500 }
      );
    }

    const documentId = docRow.id;

    // 2) chunking
    const chunks = chunkText(raw_text, 900);

    if (chunks.length === 0) {
      // status failed
      await supabase
        .from("documents")
        .update({ ingestion_status: "failed", ingestion_error: "No chunks produced" })
        .eq("id", documentId);

      return NextResponse.json(
        { ok: false, error: "No chunks produced" },
        { status: 400 }
      );
    }

    // 3) embeddings (batch)
    const embeddings = await embedTexts({
      apiKey,
      model: "text-embedding-3-small",
      input: chunks.map((c) => c.content),
    });

    // 4) insert chunks
    const payload = chunks.map((c, i) => ({
      owner_id: user.id,
      document_id: documentId,
      chunk_index: c.index,
      content: c.content,
      embedding: embeddings[i],
    }));

    const { error: chunkInsertError } = await supabase
      .from("document_chunks")
      .insert(payload);

    if (chunkInsertError) {
      await supabase
        .from("documents")
        .update({ ingestion_status: "failed", ingestion_error: chunkInsertError.message })
        .eq("id", documentId);

      return NextResponse.json(
        { ok: false, error: chunkInsertError.message },
        { status: 500 }
      );
    }

    // 5) documents status processed
    const { error: docUpdateError } = await supabase
      .from("documents")
      .update({ ingestion_status: "processed", ingestion_error: null })
      .eq("id", documentId);

    if (docUpdateError) {
      return NextResponse.json(
        { ok: false, error: docUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      document_id: documentId,
      chunk_count: chunks.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
