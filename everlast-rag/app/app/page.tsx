import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  firstname: string | null;
  lastname: string | null;
  openai_api_key: string | null;
};

function buildGreeting(firstname: string | null, lastname: string | null) {
  const fn = (firstname ?? "").trim();
  const ln = (lastname ?? "").trim();

  if (fn && ln) return `Hallo ${fn} ${ln}`;
  if (fn && !ln) return `Hallo ${fn}`;
  if (!fn && ln) return `Hallo ${ln}`;
  return "Hallo";
}

export default async function AppHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("firstname, lastname, openai_api_key")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { count: documentCount, error: documentsError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  const firstname = profile?.firstname ?? null;
  const lastname = profile?.lastname ?? null;
  const hasUserOpenAiKey = Boolean(
    (profile?.openai_api_key ?? "").trim().length > 0
  );
  const docsCount = Number(documentCount ?? 0);
  const hasDocuments = docsCount > 0;

  const greeting = buildGreeting(firstname, lastname);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold">App</h1>

      <p className="mt-3 text-white/80">
        {greeting}, du bist angemeldet als{" "}
        <strong className="font-semibold">{user.email}</strong>.
      </p>

      {hasUserOpenAiKey ? (
        <p className="mt-2 text-sm text-white/60">
          Du hast deinen eigenen Open AI API Key in den{" "}
          <Link
            href="/settings"
            className="text-[color:var(--ev-brand)] underline underline-offset-4"
          >
            Einstellungen
          </Link>{" "}
          hinterlegt.
        </p>
      ) : (
        <div className="mt-4 ev-card ev-surface p-5">
          <p className="font-semibold text-white">
            Bitte hinterlegen Sie Ihren eigenen Open AI API Key in den{" "}
            <Link
              href="/settings"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Einstellungen
            </Link>
            , um weitere Modelle freizuschalten. Solange Sie keinen eigenen Key
            hinterlegt haben, ist im{" "}
            <Link
              href="/chat"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Chat
            </Link>{" "}
            nur das Model &quot;gpt-5-nano&quot; verfuegbar.
          </p>

          <p className="mt-2 text-white/70">
            Wenn du noch keinen API-Schluessel hast, gehe auf{" "}
            <a
              href="https://openai.com/de-DE/index/openai-api/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              https://openai.com/de-DE/index/openai-api/
            </a>{" "}
            und besorge dir einen.
          </p>
        </div>
      )}

      {hasDocuments ? (
        <div className="mt-4 ev-card ev-surface p-5">
          <p className="font-semibold text-white">
            In deiner <Link
              href="/knowledge"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Wissensdatenbank
            </Link> {docsCount === 1 ? "befindet" : "befinden"} sich {docsCount}{" "}
            {docsCount === 1 ? "Dokument" : "Dokumente"}.
          </p>
          <p className="mt-2 text-white/70">
            Verwalte sie in{" "}
            <Link
              href="/knowledge"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Wissen
            </Link>
            . Du kannst jetzt auf Basis dieser Informationen mit dem{" "}
            <Link
              href="/chat"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Chat
            </Link>{" "}
            interagieren.
          </p>
        </div>
      ) : (
        <div className="mt-4 ev-card ev-surface p-5">
          <p className="font-semibold text-white">
            Deine Wissensdatenbank ist leer!
          </p>
          <p className="mt-2 text-white/70">
            Bevor du mit dem{" "}
            <Link
              href="/chat"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Chat
            </Link>{" "}
            beginnst, lege bitte eine Wissensdatenbank in{" "}
            <Link
              href="/knowledge"
              className="text-[color:var(--ev-brand)] underline underline-offset-4"
            >
              Wissen
            </Link>{" "}
            an!
          </p>
        </div>
      )}
    </main>
  );
}
