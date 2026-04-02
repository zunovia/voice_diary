"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DialecticViz from "@/components/thinking/DialecticViz";
import ScamperViz from "@/components/thinking/ScamperViz";
import BisociationViz from "@/components/thinking/BisociationViz";
import ForcedConnectionViz from "@/components/thinking/ForcedConnectionViz";

type Memo = {
  id: string;
  title: string | null;
  category: string | null;
  created_at: string;
};

type ThinkingMethod = "dialectic" | "scamper" | "bisociation" | "forced";

const METHODS: { key: ThinkingMethod; label: string; desc: string; icon: string }[] = [
  { key: "dialectic", label: "弁証法", desc: "テーゼ→アンチテーゼ→ジンテーゼ", icon: "M12 2L2 7l10 5 10-5-10-5z" },
  { key: "scamper", label: "SCAMPER", desc: "7つの視点でアイデア変形", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { key: "bisociation", label: "異分野接続", desc: "2つのフレームの交差点", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { key: "forced", label: "強制接続", desc: "無関係なメモを強制的に結合", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
];

export default function ThinkingPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]);
  const [method, setMethod] = useState<ThinkingMethod>("dialectic");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/memos")
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.memos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleMemo = (id: string) => {
    setSelectedMemoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedMemoIds(memos.map((m) => m.id));
  };

  const runThinking = async () => {
    if (selectedMemoIds.length < 2) {
      setError("2つ以上のメモを選択してください");
      return;
    }
    setError("");
    setThinking(true);
    setResult(null);

    try {
      const res = await fetch("/api/thinking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, memoIds: selectedMemoIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-lg font-bold">Thinking Lab</h1>
        <p className="text-xs text-muted-foreground mt-1">
          メモを選択し、思考フレームワークで新しいアイデアを生み出す
        </p>
      </div>

      {/* Method Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMethod(m.key); setResult(null); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              method === m.key
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <svg className="w-5 h-5 mb-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
            </svg>
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-[10px] text-muted-foreground">{m.desc}</div>
          </button>
        ))}
      </div>

      <Separator />

      {/* Memo Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">メモを選択</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs h-7">
              すべて選択
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedMemoIds([])} className="text-xs h-7">
              クリア
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {memos.map((memo) => (
              <button
                key={memo.id}
                onClick={() => toggleMemo(memo.id)}
                className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all ${
                  selectedMemoIds.includes(memo.id)
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-card border border-border hover:border-primary/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedMemoIds.includes(memo.id) ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}
                >
                  {selectedMemoIds.includes(memo.id) && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{memo.title || "無題"}</div>
                </div>
                {memo.category && (
                  <Badge variant="outline" className="text-[8px] shrink-0">{memo.category}</Badge>
                )}
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{selectedMemoIds.length}件選択中</p>
      </div>

      {/* Run Button */}
      <Button
        onClick={runThinking}
        disabled={thinking || selectedMemoIds.length < 2}
        className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
        size="lg"
      >
        {thinking ? (
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            思考中...
          </span>
        ) : (
          `${METHODS.find((m) => m.key === method)?.label}で分析する`
        )}
      </Button>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Result Visualization */}
      {result && (
        <div className="space-y-4">
          <Separator />
          <h2 className="text-sm font-bold">結果</h2>
          {method === "dialectic" && <DialecticViz data={result} />}
          {method === "scamper" && <ScamperViz data={result} />}
          {method === "bisociation" && <BisociationViz data={result} />}
          {method === "forced" && <ForcedConnectionViz data={result} />}
        </div>
      )}
    </div>
  );
}
