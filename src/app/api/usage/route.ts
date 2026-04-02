import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayData } = await supabase
      .from("api_usage")
      .select("api_name, model, input_tokens, output_tokens, estimated_cost_usd")
      .gte("created_at", today.toISOString());

    // This month's usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const { data: monthData } = await supabase
      .from("api_usage")
      .select("api_name, model, input_tokens, output_tokens, estimated_cost_usd, created_at")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false });

    // Aggregate
    const aggregate = (rows: typeof todayData) => {
      if (!rows) return { totalCost: 0, totalInputTokens: 0, totalOutputTokens: 0, requestCount: 0, byModel: {} as Record<string, { cost: number; requests: number; inputTokens: number; outputTokens: number }> };
      const byModel: Record<string, { cost: number; requests: number; inputTokens: number; outputTokens: number }> = {};
      let totalCost = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      for (const row of rows) {
        totalCost += row.estimated_cost_usd;
        totalInputTokens += row.input_tokens;
        totalOutputTokens += row.output_tokens;
        const key = `${row.api_name}/${row.model}`;
        if (!byModel[key]) byModel[key] = { cost: 0, requests: 0, inputTokens: 0, outputTokens: 0 };
        byModel[key].cost += row.estimated_cost_usd;
        byModel[key].requests += 1;
        byModel[key].inputTokens += row.input_tokens;
        byModel[key].outputTokens += row.output_tokens;
      }
      return { totalCost, totalInputTokens, totalOutputTokens, requestCount: rows.length, byModel };
    };

    // Daily breakdown for chart (last 30 days)
    const dailyMap: Record<string, number> = {};
    if (monthData) {
      for (const row of monthData) {
        const day = row.created_at.split("T")[0];
        dailyMap[day] = (dailyMap[day] || 0) + row.estimated_cost_usd;
      }
    }
    const daily = Object.entries(dailyMap)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return Response.json({
      today: aggregate(todayData),
      month: aggregate(monthData),
      daily,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return Response.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
