"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Insight = {
  id: string;
  memo_ids: string[];
  insight: string;
  domain: string | null;
  created_at: string;
};

const DOMAIN_COLORS: Record<string, string> = {
  ビジネス: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  技術: "text-green-400 bg-green-500/10 border-green-500/20",
  思想: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  アクション: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const DOMAIN_KEYS: Record<string, string> = {
  ビジネス: "cat.business",
  技術: "cat.tech",
  思想: "cat.thought",
  アクション: "cat.action",
};

export default function InsightsPage() {
  const { t } = useI18n();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // Load existing insights on mount
  useEffect(() => {
    fetch("/api/analyze")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.insights || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析に失敗しました");

      // Prepend new insights
      setInsights((prev) => [...(data.insights || []), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-lg font-bold">{t("insights.title")}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("insights.subtitle")}
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
            {t("insights.analyzing")}
          </span>
        ) : (
          t("insights.analyze")
        )}
      </Button>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-12">{t("common.loading")}</div>
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
              {t("insights.none")}
            </p>
            <p className="text-muted-foreground/60 text-xs">
              {t("insights.noneHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{insights.length}{t("insights.count")}</p>
          {insights.map((insight) => (
            <Card
              key={insight.id}
              className={`border ${DOMAIN_COLORS[insight.domain || ""] || "border-border"}`}
            >
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={DOMAIN_COLORS[insight.domain || ""] || ""}
                  >
                    {DOMAIN_KEYS[insight.domain || ""] ? t(DOMAIN_KEYS[insight.domain || ""] as Parameters<typeof t>[0]) : (insight.domain || t("cat.other"))}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {insight.memo_ids?.length || 0}{t("insights.fromMemos")}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(insight.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm leading-relaxed">{insight.insight}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
