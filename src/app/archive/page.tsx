"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MonthData = {
  year: number;
  month: number;
  count: number;
};

export default function ArchivePage() {
  const { t } = useI18n();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memos")
      .then((r) => r.json())
      .then((data) => {
        const memos = data.memos || [];
        const monthMap = new Map<string, MonthData>();
        memos.forEach((m: { created_at: string }) => {
          const date = new Date(m.created_at);
          const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          if (!monthMap.has(key)) {
            monthMap.set(key, {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              count: 0,
            });
          }
          monthMap.get(key)!.count++;
        });
        const sorted = [...monthMap.values()].sort(
          (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month)
        );
        setMonths(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-bold">{t("archive.title")}</h1>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">{t("common.loading")}</div>
      ) : months.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t("common.noMemos")}</p>
            <a href="/record">
              <Button>{t("common.recordFirst")}</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {months.map((m) => (
            <a key={`${m.year}-${m.month}`} href={`/archive/${m.year}/${m.month}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold group-hover:text-primary transition-colors">
                    {t(`month.${m.month}` as Parameters<typeof t>[0])}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.year}{t("archive.year")}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{m.count}</span>{" "}
                    {t("archive.memoCount")}
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
