import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SetupForm from "./SetupForm";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("users")
    .select("username, is_anonymous, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  const { next } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <SetupForm
        initialUsername={profile?.username ?? ""}
        initialAnonymous={profile?.is_anonymous ?? false}
        next={next ?? "/"}
      />
    </div>
  );
}
