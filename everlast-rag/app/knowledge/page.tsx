import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DocRow = {
  id: number;
  document_name: string;
  ingestion_status: string;
  created_at: string;
};

export default async function KnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // docs list
  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id, document_name, ingestion_status, created_at")
    .order("id", { ascending: false })
    .limit(20)
    .returns<DocRow[]>();

  if (docsError) throw new Error(docsError.message);

  async function ingest(formData: FormData) {
    "use server";

    const name = String(formData.get("document_name") || "").trim();
    const raw = String(formData.get("raw_text") || "").trim();

    if (!raw) {
      redirect("/knowledge?error=missing_text");
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Achtung: Hier ist NEXT_PUBLIC_SITE_URL Pflicht (du nutzt es bereits in auth/actions.ts)
      body: JSON.stringify({
        document_name: name || "Untitled",
        raw_text: raw,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      redirect(`/knowledge?error=${encodeURIComponent(text || "ingest_failed")}`);
    }

    redirect("/knowledge?ok=1");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Wissen</h1>

      <p className="mt-2 text-sm text-gray-600">
        Text einfügen, speichern, Embeddings erzeugen, Retrieval-ready machen.
      </p>

      <form action={ingest} className="mt-6 grid gap-3">
        <label className="grid gap-1.5">
          <span>Titel</span>
          <input
            name="document_name"
            placeholder="z.B. Produkt FAQ"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="grid gap-1.5">
          <span>Text</span>
          <textarea
            name="raw_text"
            rows={10}
            placeholder="Hier Text einfügen..."
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg border border-gray-900 px-3 py-2 font-semibold transition hover:bg-gray-900 hover:text-white"
        >
          Speichern und indexieren
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold">Dokumente</h2>

      <div className="mt-3 grid gap-2">
        {docs && docs.length > 0 ? (
          docs.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{d.document_name}</div>
                <div className="text-xs text-gray-600">{d.ingestion_status}</div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                ID {d.id} - {new Date(d.created_at).toLocaleString("de-DE")}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">Noch keine Dokumente.</p>
        )}
      </div>
    </main>
  );
}
