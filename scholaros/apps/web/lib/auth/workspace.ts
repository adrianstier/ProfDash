import { SupabaseClient } from "@supabase/supabase-js";

export async function verifyWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<{ id: string; role: string } | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return data;
}
