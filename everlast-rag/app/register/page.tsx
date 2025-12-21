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
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Register</h1>

      {error && (
        <p style={{ marginTop: 12, color: "crimson" }}>
          Error: {error}
        </p>
      )}

      <form action={signUp} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
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
          Create account
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </main>
  );
}
