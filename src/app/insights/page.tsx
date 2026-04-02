"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Insight = {
  id: string;
  memo_ids: string[];
  insight: string;
  domain: string | null;
  created_at: string;
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setInsights(
        data.insights.map(
          (
            ins: { memo_ids: string[]; insight: string; domain: string },
            i: number
          ) => ({
            id: `new-${i}`,
            ...ins,
            created_at: new Date().toISOString(),
          })
        )
      );
    } catch (error) {
      console.error(error);
      alert("分析に失敗しました。メモが2件以上必要です。");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-lg font-bold">インサイト分析</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Claude AIがメモ間の接続を見つけ、アイデアの種を生成します
        </p>
      </div>

      <Button
        onClick={runAnalysis}
        disabled={analyzing}
        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg"
        size="lg"
      >
        {analyzing ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Claude AIが分析中...
          </span>
        ) : (
          "メモを分析してインサイトを生成"
        )}
      </Button>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">読み込み中...</div>
      ) : insights.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <svg
              className="w-16 h-16 mx-auto text-muted-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-muted-foreground text-sm">
              まだインサイトがありません
            </p>
            <p className="text-muted-foreground/60 text-xs">
              上のボタンを押してメモの接続分析を実行してください
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{insight.domain}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {insight.memo_ids.length}件のメモから
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{insight.insight}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
