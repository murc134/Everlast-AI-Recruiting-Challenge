import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { newChat } from "./actions";
import ChatClient from "./ui";
import SessionList from "./session-list";

type ChatSessionRow = {
  id: number;
  title: string;
  created_at: string;
};

type MessageRow = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata: any;
};

type ProfileRow = {
  openai_api_key: string | null;
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("openai_api_key")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) throw new Error(profileError.message);

  const hasUserOpenAiKey = Boolean((profile?.openai_api_key ?? "").trim().length > 0);

  const sp = await searchParams;
  const chatIdParam = typeof sp.id === "string" ? sp.id : null;
  const chatId = chatIdParam ? Number(chatIdParam) : null;

  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at")
    .order("id", { ascending: false })
    .limit(50)
    .returns<ChatSessionRow[]>();

  if (sessionsError) throw new Error(sessionsError.message);

  const activeChatId =
    Number.isFinite(chatId ?? NaN) ? (chatId as number) : sessions?.[0]?.id ?? null;

  const activeSession = sessions?.find((s) => s.id === activeChatId) ?? null;

  let messages: MessageRow[] = [];
  if (activeChatId) {
    const { data: msgs, error: msgsError } = await supabase
      .from("messages")
      .select("id, role, content, created_at, metadata")
      .eq("chat_id", activeChatId)
      .order("id", { ascending: true })
      .returns<MessageRow[]>();

    if (msgsError) throw new Error(msgsError.message);
    messages = msgs ?? [];
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Chat</h1>

        <form action={newChat}>
          <button type="submit" className="ev-button-accent">
            New chat
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <aside className="ev-surface p-4">
          <div className="ev-pill">Sessions</div>
          <SessionList sessions={sessions ?? []} activeChatId={activeChatId} />
        </aside>

        <section className="ev-surface p-4">
          {activeChatId ? (
            <ChatClient
              chatId={activeChatId}
              initialMessages={messages}
              initialTitle={activeSession?.title ?? "New chat"}
              canUseAllModels={hasUserOpenAiKey}
            />
          ) : (
            <div className="text-white/70">
              Erstelle zuerst einen Chat via "New chat".
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
