import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const linkClassName =
    "text-sm font-medium text-gray-700 transition hover:text-gray-900";

  return (
    <header className="border-b border-gray-200">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
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

        <div className="text-xs text-gray-500">
          {user ? `Angemeldet: ${user.email}` : "Nicht angemeldet"}
        </div>
      </nav>
    </header>
  );
}
