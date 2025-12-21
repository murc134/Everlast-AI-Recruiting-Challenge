import { signIn } from "@/app/auth/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : null;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-semibold text-white">Anmelden</h1>

      {error && <p className="mt-3 text-sm text-red-300">Fehler: {error}</p>}

      <form action={signIn} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-white/80">
          <span>E-Mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          />
        </label>

        <label className="grid gap-2 text-sm text-white/80">
          <span>Passwort</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          />
        </label>

        <button
          type="submit"
          className="ev-button-accent w-full"
        >
          Anmelden
        </button>
      </form>

      <p className="mt-5 text-sm text-white/70">
        Noch kein Konto?{" "}
        <Link
          href="/register"
          className="text-[color:var(--ev-brand)] underline underline-offset-4"
        >
          Registrieren
        </Link>
      </p>
    </main>
  );
}
