import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("firstname, lastname, openai_api_key")
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

    // Trigger hat die Row angelegt. Falls nicht: upsert als Fallback.
    const { error } = await supabaseServer.from("profiles").upsert(
      {
        id: u.id,
        firstname,
        lastname,
        openai_api_key,
      },
      { onConflict: "id" }
    );

    if (error) {
      redirect(`/settings?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/app");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <form action={save} className="mt-4 grid gap-3">
        <label className="grid gap-1.5">
          <span>Vorname</span>
          <input
            name="firstname"
            defaultValue={profile?.firstname ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="grid gap-1.5">
          <span>Nachname</span>
          <input
            name="lastname"
            defaultValue={profile?.lastname ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="grid gap-1.5">
          <span>OpenAI API-Schluessel (nur Challenge)</span>
          <input
            name="openai_api_key"
            type="password"
            defaultValue={profile?.openai_api_key ?? ""}
            placeholder="sk-..."
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg border border-gray-900 px-3 py-2 font-semibold transition hover:bg-gray-900 hover:text-white"
        >
          Speichern
        </button>
      </form>

      <p className="mt-4 text-sm">
        <a href="/app" className="text-blue-600 underline underline-offset-2">
          Zurueck
        </a>
      </p>
    </main>
  );
}
