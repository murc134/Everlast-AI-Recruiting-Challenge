"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isNextNavigationError, toErrorMessage } from "@/lib/errors";

export async function newChat() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        owner_id: user.id,
        title: "New chat",
      })
      .select("id")
      .single<{ id: number }>();

    if (error) {
      redirect(`/chat?error=${encodeURIComponent(`Create chat failed: ${error.message}`)}`);
    }

    if (!data?.id) {
      redirect(`/chat?error=${encodeURIComponent("Create chat failed: missing chat id")}`);
    }

    redirect(`/chat?id=${data.id}`);
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = toErrorMessage(error, "Create chat failed");
    redirect(`/chat?error=${encodeURIComponent(message)}`);
  }
}
