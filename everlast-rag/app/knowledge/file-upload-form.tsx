"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function FileUploadForm() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setState({ status: "uploading" });

    try {
      const response = await fetch("/api/ingest-file", {
        method: "POST",
        body: formData,
      });

      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = (await response.json()) as { ok?: boolean; error?: string };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.error ?? "Upload fehlgeschlagen.",
        });
        return;
      }

      form.reset();
      setState({
        status: "success",
        message: "Datei hochgeladen und indexiert.",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
      setState({ status: "error", message });
    }
  };

  const isBusy = state.status === "uploading" || isPending;

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="grid gap-3"
    >
      <label className="grid gap-1.5">
        <span>.txt Datei hochladen</span>
        <input
          type="file"
          name="file"
          accept=".txt"
          className="rounded-lg border border-gray-300 px-3 py-2"
          required
          disabled={isBusy}
        />
        <p className="text-sm text-gray-600">Nur .txt Dateien werden unterstuetzt.</p>
      </label>

      {state.status === "uploading" && (
        <div className="text-sm text-gray-600">Upload laeuft...</div>
      )}
      {state.status === "error" && (
        <div className="Error">
          <div className="font-semibold">Fehler</div>
          <div className="mt-1 break-words">{state.message}</div>
        </div>
      )}
      {state.status === "success" && (
        <div className="Success">{state.message}</div>
      )}

      <button
        type="submit"
        className="rounded-lg border border-gray-900 px-3 py-2 font-semibold transition hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isBusy}
      >
        Hochladen und indexieren
      </button>
    </form>
  );
}
