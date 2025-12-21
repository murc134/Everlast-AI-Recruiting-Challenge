import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const linkClassName = "ev-link text-sm font-medium";

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {user && (
            <Link href="/" className={linkClassName}>
              Start
            </Link>
          )}

          <a
            href="/api/ping"
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            Ping-API
          </a>

          {user && (
  <Link href="/knowledge" className={linkClassName}>
    Wissen
  </Link>
)}


          <Link href="/register" className={linkClassName}>
            Registrieren
          </Link>

          {user ? (
            <>
              <Link href="/settings" className={linkClassName}>
                Einstellungen
              </Link>
              <a href="/logout" className={linkClassName}>
                Abmelden
              </a>
            </>
          ) : (
            <Link href="/login" className={linkClassName}>
              Anmelden
            </Link>
          )}
        </div>

        <div className="text-xs text-white/50">
          {user ? `Angemeldet: ${user.email}` : "Nicht angemeldet"}
        </div>
      </nav>
    </header>
  );
}
