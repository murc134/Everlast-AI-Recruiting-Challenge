"use client";

import { useState } from "react";

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export default function ConnectionTest() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function runTest() {
    const input = document.getElementById("openai_api_key") as HTMLInputElement | null;
    const apiKey = String(input?.value ?? "").trim();

    if (!apiKey) {
      setStatus({ state: "error", message: "Bitte zuerst einen API Key eingeben." });
      return;
    }

    setStatus({ state: "loading" });

    try {
      const res = await fetch("/api/openai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const err = json?.error || "Verbindungstest fehlgeschlagen.";
        setStatus({ state: "error", message: String(err) });
        return;
      }

      setStatus({ state: "success", message: "Verbindung erfolgreich" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verbindungstest fehlgeschlagen.";
      setStatus({ state: "error", message });
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={runTest}
        disabled={status.state === "loading"}
        className="ev-button w-full sm:w-auto"
      >
        {status.state === "loading" ? "Teste..." : "Verbindungstest"}
      </button>

      {status.state === "success" ? (
        <p className="text-xs text-emerald-300">{status.message}</p>
      ) : null}
      {status.state === "error" ? (
        <p className="text-xs text-rose-300">{status.message}</p>
      ) : null}
    </div>
  );
}
