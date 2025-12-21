import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunking";
import { embedTexts } from "@/lib/openai";

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

  if (file.type !== "text/plain") {
    return NextResponse.json({ ok: false, error: "Only .txt files allowed" }, { status: 400 });
  }

  if (file.size > 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large (max 1MB)" }, { status: 400 });
  }

  const raw_text = (await file.text()).trim();
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
