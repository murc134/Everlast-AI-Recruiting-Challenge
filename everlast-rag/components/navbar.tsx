import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header style={{ borderBottom: "1px solid #e5e7eb" }}>
      <nav
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user && <Link href="/">Home</Link>}

          <a href="/api/ping" target="_blank" rel="noreferrer">
            Ping API
          </a>

          <Link href="/register">Register</Link>

          {user ? (
            <>
              <Link href="/settings">Settings</Link>
              <a href="/logout">Logout</a>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {user ? `Signed in: ${user.email}` : "Not signed in"}
        </div>
      </nav>
    </header>
  );
}
