import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>App</h1>

      <p style={{ marginTop: 12 }}>
        Logged in as: <b>{user.email}</b>
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <Link href="/settings">Settings</Link>
        <a href="/logout">Logout</a>
        <a href="/api/ping" target="_blank" rel="noreferrer">
          Ping API
        </a>
      </div>
    </main>
  );
}
