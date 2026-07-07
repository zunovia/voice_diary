import { createServerClient } from "@/lib/supabase";
import { getNeighbors, type Neighbor } from "@/lib/neighbors";
import { notFound } from "next/navigation";
import Link from "next/link";
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

  // ノウアスフィアの隣人（PD古典の最近傍）。アンビエント表示なので、失敗しても本文は壊さない。
  let neighbors: Neighbor[] = [];
  try {
    neighbors = await getNeighbors(supabase, memo);
  } catch {
    neighbors = [];
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm">&larr; グラフに戻る</Button>
      </Link>

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

        {/* ノウアスフィアの隣人 — メモの埋め込みに最も近いPD古典を、静かに隣に置く */}
        {neighbors.length > 0 && (
          <section className="space-y-3 pt-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span aria-hidden>✦</span> ノウアスフィアの隣人
              </h2>
              <p className="text-xs text-muted-foreground">
                このメモの近くで、少し先を歩いている言葉たち。
              </p>
            </div>

            {neighbors.map((n) => (
              <Card
                key={n.id}
                className="border-primary/15 bg-gradient-to-b from-primary/[0.04] to-transparent"
              >
                <CardContent className="space-y-2 py-4">
                  <p
                    className="text-base leading-relaxed"
                    style={{
                      fontFamily:
                        "'Hiragino Mincho ProN', 'Yu Mincho', 'YuMincho', serif",
                    }}
                  >
                    {n.text_ja}
                  </p>
                  {n.gloss && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.gloss}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground text-right">
                    — {n.author}『{n.source}』
                  </p>
                  {n.next_step && (
                    <>
                      <Separator className="my-1" />
                      <p className="text-sm text-primary/90 italic">
                        → {n.next_step}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}

            <p className="text-[10px] text-muted-foreground/70 text-right">
              出典はすべてパブリックドメイン。「→」はアプリからの問いかけです。
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
