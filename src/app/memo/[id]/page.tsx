import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function MemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: memo, error } = await supabase
    .from("memos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !memo) return notFound();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <a href="/">
        <Button variant="ghost" size="sm">&larr; グラフに戻る</Button>
      </a>

      <div className="space-y-4">
        <h1 className="text-xl font-bold">{memo.title || "無題"}</h1>

        <div className="flex items-center gap-3">
          {memo.category && <Badge>{memo.category}</Badge>}
          <span className="text-xs text-muted-foreground">
            {new Date(memo.created_at).toLocaleString("ja-JP")}
          </span>
        </div>

        <Separator />

        {/* Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-primary">AI要約</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{memo.summary}</p>
          </CardContent>
        </Card>

        {/* Tags */}
        {memo.tags && memo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {memo.tags.map((tag: string) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Raw Text */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              原文（文字起こし）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {memo.raw_text}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
