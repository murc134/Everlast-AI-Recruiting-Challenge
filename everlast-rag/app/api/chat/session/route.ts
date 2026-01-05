import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UpdateTitleBody = {
  chat_id?: number;
  title?: string;
};

type DeleteChatBody = {
  chat_id?: number;
};

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.message !== "Auth session missing!") {
      return NextResponse.json(
        { ok: false, error: userError.message },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateTitleBody;
    const chatId = Number(body.chat_id);
    const rawTitle = String(body.title || "").trim();

    if (!Number.isFinite(chatId)) {
      return NextResponse.json({ ok: false, error: "chat_id is required" }, { status: 400 });
    }
    if (!rawTitle) {
      return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    }

    const title = rawTitle.slice(0, 120);

    const { data: chatRow, error: chatError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", chatId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: number }>();

    if (chatError) {
      return NextResponse.json({ ok: false, error: chatError.message }, { status: 500 });
    }
    if (!chatRow) {
      return NextResponse.json({ ok: false, error: "Chat not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("chat_sessions")
      .update({ title })
      .eq("id", chatId)
      .eq("owner_id", user.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chat_id: chatId, title });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.message !== "Auth session missing!") {
      return NextResponse.json(
        { ok: false, error: userError.message },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as DeleteChatBody;
    const chatId = Number(body.chat_id);

    if (!Number.isFinite(chatId)) {
      return NextResponse.json({ ok: false, error: "chat_id is required" }, { status: 400 });
    }

    const { data: chatRow, error: chatError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", chatId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: number }>();

    if (chatError) {
      return NextResponse.json({ ok: false, error: chatError.message }, { status: 500 });
    }
    if (!chatRow) {
      return NextResponse.json({ ok: false, error: "Chat not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", chatId)
      .eq("owner_id", user.id);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chat_id: chatId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
