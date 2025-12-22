import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/errors";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(`Logout failed: ${error.message}`)}`
      );
    }
  } catch (error) {
    const message = toErrorMessage(error, "Logout failed");
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
