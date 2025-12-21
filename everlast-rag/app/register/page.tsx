import { signUp } from "@/app/auth/actions";
import Link from "next/link";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? decodeURIComponent(sp.error) : null;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Registrieren</h1>

      {error && (
        <p className="mt-3 text-sm text-red-600">Fehler: {error}</p>
      )}

      <form action={signUp} className="mt-4 grid gap-3">
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
            autoComplete="new-password"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg border border-gray-900 px-3 py-2 font-semibold transition hover:bg-gray-900 hover:text-white"
        >
          Konto erstellen
        </button>
      </form>

      <p className="mt-4 text-sm">
        Schon ein Konto?{" "}
        <Link href="/login" className="text-blue-600 underline underline-offset-2">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
