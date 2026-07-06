"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type UsageData = {
  today: AggregateData;
  month: AggregateData;
  daily: Array<{ date: string; cost: number }>;
};

type AggregateData = {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  byModel: Record<
    string,
    { cost: number; requests: number; inputTokens: number; outputTokens: number }
  >;
};

export default function UsagePage() {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        setUsage(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatCost = (usd: number) => {
    if (usd < 0.01) return `$${usd.toFixed(6)}`;
    return `$${usd.toFixed(4)}`;
  };

  const formatYen = (usd: number) => {
    const yen = usd * 150; // approximate
    if (yen < 1) return `${yen.toFixed(2)}円`;
    return `${Math.round(yen)}円`;
  };

  const formatTokens = (n: number) => {
    if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n > 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center text-muted-foreground py-12">{t("common.loading")}</div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center text-muted-foreground py-12">{t("usage.fetchError")}</div>
      </div>
    );
  }

  const maxDailyCost = Math.max(...usage.daily.map((d) => d.cost), 0.001);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("usage.title")}</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">&larr; {t("common.back")}</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("usage.todayCost")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCost(usage.today.totalCost)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatYen(usage.today.totalCost)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {usage.today.requestCount} {t("usage.todayRequests")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("usage.monthCost")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(usage.month.totalCost)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatYen(usage.month.totalCost)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {usage.month.requestCount} {t("usage.monthRequests")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("usage.todayTokens")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatTokens(usage.today.totalInputTokens + usage.today.totalOutputTokens)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {t("usage.input")} {formatTokens(usage.today.totalInputTokens)} / {t("usage.output")} {formatTokens(usage.today.totalOutputTokens)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("usage.monthTokens")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatTokens(usage.month.totalInputTokens + usage.month.totalOutputTokens)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {t("usage.input")} {formatTokens(usage.month.totalInputTokens)} / {t("usage.output")} {formatTokens(usage.month.totalOutputTokens)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      {usage.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("usage.dailyChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {usage.daily.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary/80 rounded-t min-h-[2px] transition-all"
                    style={{
                      height: `${(day.cost / maxDailyCost) * 100}%`,
                    }}
                  />
                  <span className="text-[8px] text-muted-foreground -rotate-45 origin-top-left">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("usage.modelBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(usage.month.byModel).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("usage.noData")}</p>
          ) : (
            Object.entries(usage.month.byModel).map(([model, data]) => (
              <div
                key={model}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <Badge variant="outline" className="text-[10px]">
                    {model}
                  </Badge>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {data.requests}{t("usage.times")} | {t("usage.input")} {formatTokens(data.inputTokens)} / {t("usage.output")}{" "}
                    {formatTokens(data.outputTokens)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatCost(data.cost)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatYen(data.cost)}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        {t("usage.costNote")}
      </p>
    </div>
  );
}
