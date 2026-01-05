import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConnectionTest from "./connection-test";

const DEFAULT_SYSTEM_PROMPT = [
  "Du bist ein RAG-Assistent.",
  "Nutze ausschliesslich den bereitgestellten KONTEXT um zu antworten.",
  "Wenn der Kontext nicht ausreicht, sage klar: 'Nicht in der Wissensbasis'.",
  "Gib am Ende eine Quellenliste im Format [1], [2], ... passend zu den verwendeten Textstellen.",
].join("\n");

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("firstname, lastname, openai_api_key, system_prompt")
    .eq("id", user.id)
    .maybeSingle();

  async function save(formData: FormData) {
    "use server";

    const supabaseServer = await createClient();
    const {
      data: { user: u },
    } = await supabaseServer.auth.getUser();

    if (!u) redirect("/login");

    const firstname = String(formData.get("firstname") || "").trim() || null;
    const lastname = String(formData.get("lastname") || "").trim() || null;
    const openai_api_key = String(formData.get("openai_api_key") || "").trim() || null;
    const systemPromptInput = String(formData.get("system_prompt") || "");
    const system_prompt = systemPromptInput.trim() ? systemPromptInput : null;

    // Trigger hat die Row angelegt. Falls nicht: upsert als Fallback.
    const { error } = await supabaseServer.from("profiles").upsert(
      {
        id: u.id,
        firstname,
        lastname,
        openai_api_key,
        system_prompt,
      },
      { onConflict: "id" }
    );

    if (error) {
      redirect(`/settings?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/app");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-white">Einstellungen</h1>

      <form action={save} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-white/80">
          <span>Vorname</span>
          <input
            name="firstname"
            defaultValue={profile?.firstname ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          />
        </label>

        <label className="grid gap-2 text-sm text-white/80">
          <span>Nachname</span>
          <input
            name="lastname"
            defaultValue={profile?.lastname ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          />
        </label>

        <label className="grid gap-2 text-sm text-white/80">
          <span>OpenAI API-Schluessel (nur Challenge)</span>
          <input
            name="openai_api_key"
            id="openai_api_key"
            type="password"
            defaultValue={profile?.openai_api_key ?? ""}
            placeholder="sk-..."
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          />
        </label>
        <ConnectionTest />

        <label className="grid gap-2 text-sm text-white/80">
          <span>System-Prompt</span>
          <textarea
            name="system_prompt"
            rows={6}
            defaultValue={profile?.system_prompt ?? DEFAULT_SYSTEM_PROMPT}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          />
          <span className="text-xs text-white/50">
            Der KONTEXT-Block wird automatisch angehaengt, wenn vorhanden.
          </span>
        </label>

        <button
          type="submit"
          className="ev-button-accent w-full sm:w-auto"
        >
          Speichern
        </button>
      </form>

      <p className="mt-5 text-sm text-white/70">
        <a
          href="/app"
          className="text-[color:var(--ev-brand)] underline underline-offset-4"
        >
          Zurueck
        </a>
      </p>
    </main>
  );
}
