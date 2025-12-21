import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ingestKnowledge, deleteDocument } from "./actions";
import FileUploadForm from "./file-upload-form";

type DocRow = {
  id: number;
  document_name: string;
  ingestion_status: string;
  created_at: string;
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const tab = typeof sp.tab === "string" ? sp.tab : "text";
  const isFile = tab === "file";

  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id, document_name, ingestion_status, created_at")
    .order("id", { ascending: false })
    .limit(50)
    .returns<DocRow[]>();

  if (docsError) throw new Error(docsError.message);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Wissen</h1>

      {error && (
        <div className="Error mt-4">
          <div className="font-semibold">Fehler</div>
          <div className="mt-1 break-words">
            {decodeURIComponent(error)}
          </div>
          {error === "missing_openai_key" && (
            <div className="mt-2">
              Setze zuerst deinen OpenAI Key in <a className="underline" href="/settings">/settings</a>.
            </div>
          )}
        </div>
      )}

      {ok && (
        <div className="Success mt-4">
          OK - Dokument indexiert.
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div className="flex gap-2">
          <a
            href="/knowledge?tab=text"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              !isFile
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-900 hover:border-gray-900"
            }`}
          >
            Text
          </a>
          <a
            href="/knowledge?tab=file"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              isFile
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-900 hover:border-gray-900"
            }`}
          >
            Datei
          </a>
        </div>

        {isFile ? (
          <FileUploadForm />
        ) : (
          <form action={ingestKnowledge} className="grid gap-3">
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
                placeholder="Hier Text einfuegen..."
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
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Dokumente</h2>

      <div className="mt-3 grid gap-2">
        {docs && docs.length > 0 ? (
          docs.map((d) => (
            <div key={d.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{d.document_name}</div>
                <div className="text-xs text-gray-600">{d.ingestion_status}</div>
              </div>

              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  ID {d.id} - {new Date(d.created_at).toLocaleString("de-DE")}
                </div>

                <form action={deleteDocument}>
                  <input type="hidden" name="document_id" value={d.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-900 px-2 py-1 text-xs font-semibold transition hover:bg-gray-900 hover:text-white"
                  >
                    Löschen
                  </button>
                </form>
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
