import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get database size using SQL query
    const { data, error } = await supabase.rpc("get_database_size");

    if (error) {
      // Fallback: estimate from memo count
      const { count } = await supabase
        .from("memos")
        .select("*", { count: "exact", head: true });

      const estimatedMb = ((count || 0) * 2) / 1024; // ~2KB per memo
      return Response.json({
        used_mb: Math.round(estimatedMb * 10) / 10,
        limit_mb: 500,
      });
    }

    return Response.json({
      used_mb: Math.round((data as number) * 10) / 10,
      limit_mb: 500,
    });
  } catch {
    return Response.json({ used_mb: 0, limit_mb: 500 });
  }
}
