import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    let query = supabase
      .from("memos")
      .select("id, raw_text, title, summary, tags, category, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }
    if (tag) {
      query = query.contains("tags", [tag]);
    }
    if (year && month) {
      const start = `${year}-${month.padStart(2, "0")}-01`;
      const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
      const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
      const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
      query = query.gte("created_at", start).lt("created_at", end);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ memos: data });
  } catch (error) {
    console.error("Memos fetch error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
