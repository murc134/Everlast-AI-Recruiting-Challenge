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
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Anmelden</h1>

      {error && <p className="mt-3 text-sm text-red-600">Fehler: {error}</p>}

      <form action={signIn} className="mt-4 grid gap-3">
        <label className="grid gap-1.5">
          <span>E-Mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="grid gap-1.5">
          <span>Passwort</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg border border-gray-900 px-3 py-2 font-semibold transition hover:bg-gray-900 hover:text-white"
        >
          Anmelden
        </button>
      </form>

      <p className="mt-4 text-sm">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-blue-600 underline underline-offset-2">
          Registrieren
        </Link>
      </p>
    </main>
  );
}
