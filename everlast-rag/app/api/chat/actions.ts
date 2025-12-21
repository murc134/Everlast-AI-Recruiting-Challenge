"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function newChat() {
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
    redirect(`/chat?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/chat?id=${data.id}`);
}
