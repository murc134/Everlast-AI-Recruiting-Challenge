"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunking";
import { embedTexts, resolveOpenAiKey } from "@/lib/openai";
import { isNextNavigationError, toErrorMessage } from "@/lib/errors";

type ProfileRow = { openai_api_key: string | null };

export async function ingestKnowledge(formData: FormData) {
  try {
    const document_name = String(formData.get("document_name") || "").trim() || "Untitled";
    const raw_text = String(formData.get("raw_text") || "").trim();

    if (!raw_text) redirect("/knowledge?error=missing_text");

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.message !== "Auth session missing!") {
      redirect(`/knowledge?error=${encodeURIComponent(userError.message)}`);
    }
    if (!user) redirect("/login");

    // OpenAI Key aus profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("openai_api_key")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      redirect(`/knowledge?error=${encodeURIComponent(profileError.message)}`);
    }

    const apiKey = resolveOpenAiKey(profile?.openai_api_key);
    if (!apiKey) redirect("/knowledge?error=missing_openai_key");

    // 1) documents insert (Textarea = paste)
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
      redirect(`/knowledge?error=${encodeURIComponent(docInsertError.message)}`);
    }

    const documentId = docRow.id;

    // 2) chunking
    const chunks = chunkText(raw_text, 900);
    if (chunks.length === 0) {
      await supabase
        .from("documents")
        .update({ ingestion_status: "failed", ingestion_error: "No chunks produced" })
        .eq("id", documentId);
      redirect("/knowledge?error=no_chunks");
    }

    // 3) embeddings
    let embeddings: number[][];
    try {
      embeddings = await embedTexts({
        apiKey,
        model: "text-embedding-3-small",
        input: chunks.map((c) => c.content),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Embedding failed";
      await supabase
        .from("documents")
        .update({ ingestion_status: "failed", ingestion_error: msg })
        .eq("id", documentId);
      redirect(`/knowledge?error=${encodeURIComponent(msg)}`);
    }

    // 4) chunks insert
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
      redirect(`/knowledge?error=${encodeURIComponent(chunkInsertError.message)}`);
    }

    // 5) processed
    const { error: docUpdateError } = await supabase
      .from("documents")
      .update({ ingestion_status: "processed", ingestion_error: null })
      .eq("id", documentId);

    if (docUpdateError) {
      redirect(`/knowledge?error=${encodeURIComponent(docUpdateError.message)}`);
    }

    revalidatePath("/knowledge");
    redirect(`/knowledge?ok=1&doc=${documentId}&chunks=${chunks.length}`);
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = toErrorMessage(error, "Knowledge ingest failed");
    redirect(`/knowledge?error=${encodeURIComponent(message)}`);
  }
}

export async function deleteDocument(formData: FormData) {
  try {
    const idRaw = String(formData.get("document_id") || "").trim();
    const documentId = Number(idRaw);
  
    if (!Number.isFinite(documentId)) {
      redirect("/knowledge?error=invalid_document_id");
    }
  
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  
    // Reihenfolge ist egal, weil FK cascade: document_chunks.document_id -> documents.id ON DELETE CASCADE
    // Trotzdem: wir löschen documents, chunks fallen automatisch mit.
    const { error } = await supabase.from("documents").delete().eq("id", documentId);
  
    if (error) {
      redirect(`/knowledge?error=${encodeURIComponent(`Delete failed: ${error.message}`)}`);
    }
  
    revalidatePath("/knowledge");
    redirect("/knowledge?deleted=1");
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = toErrorMessage(error, "Delete failed");
    redirect(`/knowledge?error=${encodeURIComponent(message)}`);
  }
}