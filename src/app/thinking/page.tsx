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
import MandalaViz from "@/components/thinking/MandalaViz";
import SwotViz from "@/components/thinking/SwotViz";
import BmcViz from "@/components/thinking/BmcViz";
import LogicTreeViz from "@/components/thinking/LogicTreeViz";
import LeanCanvasViz from "@/components/thinking/LeanCanvasViz";

type Memo = {
  id: string;
  title: string | null;
  category: string | null;
  created_at: string;
};

type ThinkingMethod = "dialectic" | "scamper" | "bisociation" | "forced" | "mandala" | "swot" | "bmc" | "logic_tree" | "lean";

const METHODS: { key: ThinkingMethod; label: string; desc: string; icon: string; category: string }[] = [
  { key: "dialectic", label: "弁証法", desc: "テーゼ→アンチテーゼ→ジンテーゼ", icon: "M12 2L2 7l10 5 10-5-10-5z", category: "発想" },
  { key: "scamper", label: "SCAMPER", desc: "7つの視点でアイデア変形", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", category: "発想" },
  { key: "bisociation", label: "異分野接続", desc: "2つのフレームの交差点", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", category: "発想" },
  { key: "forced", label: "強制接続", desc: "無関係なメモを強制的に結合", icon: "M13 10V3L4 14h7v7l9-11h-7z", category: "発想" },
  { key: "mandala", label: "マンダラート", desc: "9マスで思考を展開", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z", category: "発想" },
  { key: "logic_tree", label: "ロジックツリー", desc: "課題を論理的に分解", icon: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12", category: "整理" },
  { key: "swot", label: "SWOT分析", desc: "強み/弱み/機会/脅威", icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7", category: "分析" },
  { key: "bmc", label: "ビジネスモデル", desc: "9要素のキャンバス", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", category: "計画" },
  { key: "lean", label: "リーンキャンバス", desc: "スタートアップ向け計画", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", category: "計画" },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatResultAsText = (m: string, data: any): string => {
    const lines: string[] = [];
    const methodLabel = METHODS.find((x) => x.key === m)?.label || m;
    lines.push(`# Thinking Lab: ${methodLabel}`);
    lines.push(`生成日: ${new Date().toLocaleString("ja-JP")}`);
    lines.push("");

    if (m === "dialectic") {
      lines.push(`## テーゼ（正）: ${data.thesis.title}`);
      lines.push(data.thesis.content);
      lines.push("");
      lines.push(`## アンチテーゼ（反）: ${data.antithesis.title}`);
      lines.push(data.antithesis.content);
      lines.push("");
      lines.push(`## ジンテーゼ（合）: ${data.synthesis.title}`);
      lines.push(data.synthesis.content);
      lines.push("");
      lines.push("### アクションアイテム");
      data.synthesis.action_items.forEach((a: string, i: number) => lines.push(`${i + 1}. ${a}`));
    } else if (m === "scamper") {
      lines.push(`核心アイデア: ${data.core_idea}`);
      lines.push("");
      data.scamper.forEach((s: { method: string; question: string; idea: string }) => {
        lines.push(`## ${s.method}`);
        lines.push(`問い: ${s.question}`);
        lines.push(`アイデア: ${s.idea}`);
        lines.push("");
      });
    } else if (m === "swot") {
      lines.push(`分析対象: ${data.subject}`);
      lines.push("");
      lines.push("## 強み (Strengths)");
      data.strengths.forEach((s: string) => lines.push(`- ${s}`));
      lines.push("\n## 弱み (Weaknesses)");
      data.weaknesses.forEach((s: string) => lines.push(`- ${s}`));
      lines.push("\n## 機会 (Opportunities)");
      data.opportunities.forEach((s: string) => lines.push(`- ${s}`));
      lines.push("\n## 脅威 (Threats)");
      data.threats.forEach((s: string) => lines.push(`- ${s}`));
      lines.push("\n## クロスSWOT戦略");
      lines.push(`SO: ${data.cross.so}`);
      lines.push(`WO: ${data.cross.wo}`);
      lines.push(`ST: ${data.cross.st}`);
      lines.push(`WT: ${data.cross.wt}`);
    } else if (m === "mandala") {
      lines.push(`中心テーマ: ${data.center}`);
      data.themes.forEach((t: { theme: string; ideas: string[] }) => {
        lines.push(`\n## ${t.theme}`);
        t.ideas.forEach((idea: string) => lines.push(`- ${idea}`));
      });
    } else if (m === "bmc" || m === "lean") {
      lines.push(`タイトル: ${data.title}`);
      Object.entries(data).forEach(([k, v]) => {
        if (k === "title") return;
        lines.push(`\n## ${k}`);
        if (Array.isArray(v)) {
          (v as string[]).forEach((item) => lines.push(`- ${item}`));
        } else {
          lines.push(String(v));
        }
      });
    } else if (m === "logic_tree") {
      lines.push(`課題: ${data.root}`);
      data.branches.forEach((b: { label: string; children: Array<{ label: string; leaves: string[] }> }) => {
        lines.push(`\n## ${b.label}`);
        b.children.forEach((c: { label: string; leaves: string[] }) => {
          lines.push(`  ### ${c.label}`);
          c.leaves.forEach((l: string) => lines.push(`    - ${l}`));
        });
      });
    } else {
      lines.push(JSON.stringify(data, null, 2));
    }

    return lines.join("\n");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportToDocx = (m: string, data: any) => {
    const text = formatResultAsText(m, data);
    // Create a simple HTML document that Word can open
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Thinking Lab</title></head>
<body style="font-family: sans-serif;">
${text.split("\n").map((line) => {
  if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
  if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
  if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
  if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
  if (line.match(/^\d+\. /)) return `<li>${line}</li>`;
  if (line.trim() === "") return "<br/>";
  return `<p>${line}</p>`;
}).join("\n")}
</body></html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thinking-lab-${m}-${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportToGoogleDocs = (m: string, data: any) => {
    const text = formatResultAsText(m, data);
    // Open Google Docs with pre-filled content via URL
    const encoded = encodeURIComponent(text);
    window.open(
      `https://docs.google.com/document/create?title=ThinkingLab-${m}&body=${encoded}`,
      "_blank"
    );
  };

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

      {/* Method Selection by Category */}
      {["発想", "整理", "分析", "計画"].map((cat) => {
        const methods = METHODS.filter((m) => m.category === cat);
        if (methods.length === 0) return null;
        return (
          <div key={cat}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{cat}</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {methods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setMethod(m.key); setResult(null); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === m.key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <svg className="w-4 h-4 mb-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                  <div className="text-xs font-medium">{m.label}</div>
                  <div className="text-[9px] text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">結果</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => exportToDocx(method, result)}
              >
                Word出力
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => exportToGoogleDocs(method, result)}
              >
                Google Docs
              </Button>
            </div>
          </div>
          {method === "dialectic" && <DialecticViz data={result} />}
          {method === "scamper" && <ScamperViz data={result} />}
          {method === "bisociation" && <BisociationViz data={result} />}
          {method === "forced" && <ForcedConnectionViz data={result} />}
          {method === "mandala" && <MandalaViz data={result} />}
          {method === "swot" && <SwotViz data={result} />}
          {method === "bmc" && <BmcViz data={result} />}
          {method === "logic_tree" && <LogicTreeViz data={result} />}
          {method === "lean" && <LeanCanvasViz data={result} />}
        </div>
      )}
    </div>
  );
}
