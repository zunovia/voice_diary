import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export type Memo = {
  id: string;
  raw_text: string;
  title: string | null;
  summary: string | null;
  tags: string[] | null;
  category: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
};

export type Insight = {
  id: string;
  memo_ids: string[];
  insight: string;
  domain: string | null;
  created_at: string;
};
