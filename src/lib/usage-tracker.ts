import { createServerClient } from "./supabase";

// Gemini 2.5 Flash pricing (per 1M tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "text-embedding-004": { input: 0.006, output: 0 },
  "claude-sonnet": { input: 3.0, output: 15.0 },
};

export async function trackUsage({
  apiName,
  model,
  inputTokens,
  outputTokens,
  endpoint,
}: {
  apiName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  endpoint: string;
}) {
  const pricing = PRICING[model] || { input: 0, output: 0 };
  const estimatedCost =
    (inputTokens * pricing.input) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000;

  try {
    const supabase = createServerClient();
    await supabase.from("api_usage").insert({
      api_name: apiName,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCost,
      endpoint,
    });
  } catch (err) {
    console.error("Failed to track usage:", err);
  }
}

// Estimate token count from text (rough: ~1 token per 3 chars for Japanese)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}
