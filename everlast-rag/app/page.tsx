import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  // 1) Session-Check: bereits eingeloggt?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  // 2) Existieren überhaupt User im System?
  const supabaseAdmin = createAdminClient();

  const { count, error } = await supabaseAdmin
    .from("auth.users")
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  // 3) Onboarding-Entscheidung
  if (!count || count === 0) {
    redirect("/register");
  }

  redirect("/login");
}
