"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Session = {
  id: number;
  title: string;
  created_at: string;
};

export default function SessionList(props: {
  sessions: Session[];
  activeChatId: number | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Session[]>(props.sessions ?? []);
  const [confirmSession, setConfirmSession] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setItems(props.sessions ?? []);
  }, [props.sessions]);

  const hasSessions = useMemo(() => items.length > 0, [items]);

  async function deleteChat() {
    if (!confirmSession || deleting) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/chat/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: confirmSession.id }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const err = json?.error || "Loeschen fehlgeschlagen.";
        setDeleteError(String(err));
        return;
      }

      setItems((prev) => prev.filter((s) => s.id !== confirmSession.id));
      const deletedId = confirmSession.id;
      setConfirmSession(null);

      if (props.activeChatId === deletedId) {
        router.push("/chat");
      } else {
        router.refresh();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Loeschen fehlgeschlagen.";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-4 grid gap-2">
      {hasSessions ? (
        items.map((s) => {
          const active = s.id === props.activeChatId;
          return (
            <div
              key={s.id}
              className={[
                "flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition",
                active
                  ? "border-white/20 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              <Link href={`/chat?id=${s.id}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{s.title}</div>
                <div className="mt-1 text-xs text-white/50">#{s.id}</div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmSession(s);
                }}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
                aria-label={`Chat ${s.title} loeschen`}
                title="Chat loeschen"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M6 6l1 14h10l1-14" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-white/60">Noch keine Sessions.</p>
      )}

      {confirmSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="ev-card ev-surface w-full max-w-md p-5">
            <div className="text-lg font-semibold text-white">Chat loeschen</div>
            <p className="mt-2 text-white/70">
              Bist du sicher, dass du den Chat{" "}
              <span className="font-semibold text-white">
                {confirmSession.title}
              </span>{" "}
              loeschen willst?
            </p>
            {deleteError ? (
              <p className="mt-2 text-xs text-rose-300">{deleteError}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSession(null)}
                disabled={deleting}
                className="ev-button"
              >
                Nein
              </button>
              <button
                type="button"
                onClick={deleteChat}
                disabled={deleting}
                className="ev-button-accent"
              >
                {deleting ? "Loesche..." : "Ja, loeschen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
