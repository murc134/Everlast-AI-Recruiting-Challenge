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
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Settings</h1>

      <form action={save} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>First name</span>
          <input
            name="firstname"
            defaultValue={profile?.firstname ?? ""}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Last name</span>
          <input
            name="lastname"
            defaultValue={profile?.lastname ?? ""}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>OpenAI API key (Challenge only)</span>
          <input
            name="openai_api_key"
            type="password"
            defaultValue={profile?.openai_api_key ?? ""}
            placeholder="sk-..."
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #111",
            fontWeight: 600,
          }}
        >
          Save
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        <a href="/app">Back</a>
      </p>
    </main>
  );
}
