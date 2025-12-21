import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  firstname: string | null;
  lastname: string | null;
  openai_api_key: string | null;
};

function buildGreeting(firstname: string | null, lastname: string | null) {
  const fn = (firstname ?? "").trim();
  const ln = (lastname ?? "").trim();

  if (fn && ln) return `Hallo ${fn} ${ln}`;
  if (fn && !ln) return `Hallo ${fn}`;
  if (!fn && ln) return `Hallo ${ln}`;
  return "Hallo User";
}

export default async function AppHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("firstname, lastname, openai_api_key")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const firstname = profile?.firstname ?? null;
  const lastname = profile?.lastname ?? null;
  const hasOpenAiKey = Boolean((profile?.openai_api_key ?? "").trim().length > 0);

  const greeting = buildGreeting(firstname, lastname);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>App</h1>

      <p style={{ marginTop: 12 }}>
        {greeting}, du bist eingeloggt als <b>{user.email}</b>.
      </p>

      {hasOpenAiKey ? (
  <p style={{ marginTop: 8 }}>Deine App ist konfiguriert.</p>
) : (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      border: "1px solid #f59e0b",
      borderRadius: 8,
      background: "#110000",
    }}
  >
    <p style={{ fontWeight: 600 }}>
      Bitte hinterlege deinen OpenAI API Key in{" "}
      <Link href="/settings">Settings</Link>.
    </p>

    <p style={{ marginTop: 8 }}>
      Wenn du noch keinen API Key besitzt, gehe auf{" "}
      <a
        href="https://openai.com/de-DE/index/openai-api/"
        target="_blank"
        rel="noreferrer"
        style={{
          color: "#2563eb",
          textDecoration: "underline",
          fontWeight: 500,
        }}
      >
        https://openai.com/de-DE/index/openai-api/
      </a>{" "}
      und kauf dir einen.
    </p>
  </div>
)}

    </main>
  );
}
