"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import StorageIndicator from "@/components/StorageIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Memo = {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[] | null;
  category: string | null;
  created_at: string;
};

const CATEGORY_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ビジネス: "default",
  技術: "secondary",
  思想: "outline",
  生活: "destructive",
};

const CATEGORY_KEYS: Record<string, string> = {
  ビジネス: "cat.business",
  技術: "cat.tech",
  思想: "cat.thought",
  生活: "cat.life",
};

export default function ListPage() {
  const { t } = useI18n();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    fetch(`/api/memos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.memos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterCategory]);

  const categories = [...new Set(memos.map((m) => m.category).filter(Boolean))];

  const filtered = search
    ? memos.filter(
        (m) =>
          m.title?.toLowerCase().includes(search.toLowerCase()) ||
          m.summary?.toLowerCase().includes(search.toLowerCase())
      )
    : memos;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("list.title")}</h1>
        <span className="text-xs text-muted-foreground">{filtered.length}{t("common.items")}</span>
      </div>

      <StorageIndicator />

      <Input
        placeholder={t("list.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-card"
      />

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={!filterCategory ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterCategory("")}
          className="text-xs h-7"
        >
          {t("common.all")}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(cat || "")}
            className="text-xs h-7"
          >
            {CATEGORY_KEYS[cat!] ? t(CATEGORY_KEYS[cat!] as Parameters<typeof t>[0]) : cat}
          </Button>
        ))}
      </div>

      {/* Memo List */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">{t("common.noMemos")}</p>
          <a href="/record">
            <Button>{t("common.recordFirst")}</Button>
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((memo) => (
            <a key={memo.id} href={`/memo/${memo.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">
                        {memo.title || t("common.untitled")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {memo.summary}
                      </p>
                    </div>
                    {memo.category && (
                      <Badge
                        variant={
                          CATEGORY_VARIANTS[memo.category] || "secondary"
                        }
                        className="text-[10px] shrink-0"
                      >
                        {CATEGORY_KEYS[memo.category] ? t(CATEGORY_KEYS[memo.category] as Parameters<typeof t>[0]) : memo.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(memo.created_at).toLocaleString("ja-JP")}
                    </span>
                    {memo.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] h-4">
                        #{tag}
                      </Badge>
                    ))}
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
