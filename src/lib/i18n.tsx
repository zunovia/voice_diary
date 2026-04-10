"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Lang = "ja" | "en";

const translations = {
  // === Navigation ===
  "nav.graph": { ja: "グラフ", en: "Graph" },
  "nav.list": { ja: "リスト", en: "List" },
  "nav.record": { ja: "録音", en: "Record" },
  "nav.thinking": { ja: "思考", en: "Think" },
  "nav.insights": { ja: "分析", en: "Analyze" },

  // === Common ===
  "common.loading": { ja: "読み込み中...", en: "Loading..." },
  "common.error": { ja: "エラーが発生しました", en: "An error occurred" },
  "common.cancel": { ja: "キャンセル", en: "Cancel" },
  "common.close": { ja: "閉じる", en: "Close" },
  "common.reset": { ja: "リセット", en: "Reset" },
  "common.clear": { ja: "クリア", en: "Clear" },
  "common.back": { ja: "戻る", en: "Back" },
  "common.all": { ja: "すべて", en: "All" },
  "common.untitled": { ja: "無題", en: "Untitled" },
  "common.noMemos": { ja: "メモがありません", en: "No memos yet" },
  "common.recordFirst": { ja: "最初のメモを録音する", en: "Record your first memo" },
  "common.items": { ja: "件", en: "" },

  // === Categories ===
  "cat.business": { ja: "ビジネス", en: "Business" },
  "cat.tech": { ja: "技術", en: "Tech" },
  "cat.thought": { ja: "思想", en: "Thought" },
  "cat.life": { ja: "生活", en: "Life" },
  "cat.learning": { ja: "学習", en: "Learning" },
  "cat.health": { ja: "健康", en: "Health" },
  "cat.relations": { ja: "人間関係", en: "Relations" },
  "cat.creative": { ja: "クリエイティブ", en: "Creative" },
  "cat.other": { ja: "その他", en: "Other" },
  "cat.action": { ja: "アクション", en: "Action" },

  // === Record Page ===
  "record.title": { ja: "Voice Memo", en: "Voice Memo" },
  "record.subtitle": { ja: "声でメモを残して、AIが自動で整理します", en: "Record voice memos, AI organizes them automatically" },
  "record.ignitionPrompt": { ja: "発火した問い", en: "Ignited Question" },
  "record.ignitionHint": { ja: "この問いについて、声で考えを残してください", en: "Share your thoughts on this question by voice" },
  "record.tapToStart": { ja: "タップして録音開始", en: "Tap to start recording" },
  "record.recording": { ja: "録音中... タップで停止", en: "Recording... Tap to stop" },
  "record.transcribing": { ja: "Whisper AIが文字起こし中...", en: "Whisper AI transcribing..." },
  "record.processing": { ja: "AIが分析・保存中...", en: "AI analyzing & saving..." },
  "record.done": { ja: "保存完了!", en: "Saved!" },
  "record.micError": { ja: "マイクへのアクセスが許可されませんでした", en: "Microphone access denied" },
  "record.tooShort": { ja: "音声が短すぎます。もう一度お試しください。", en: "Audio too short. Please try again." },
  "record.transcribeError": { ja: "文字起こしに失敗しました", en: "Transcription failed" },
  "record.noSpeech": { ja: "音声を認識できませんでした。もう一度お試しください。", en: "No speech detected. Please try again." },
  "record.summarizeError": { ja: "要約・保存に失敗しました", en: "Summary & save failed" },
  "record.showOriginal": { ja: "原文を表示", en: "Show original" },
  "record.backToGraph": { ja: "グラフに戻る", en: "Back to Graph" },

  // === List Page ===
  "list.title": { ja: "メモ一覧", en: "Memo List" },
  "list.search": { ja: "メモを検索...", en: "Search memos..." },

  // === Knowledge Graph ===
  "graph.search": { ja: "検索... (tag: category:)", en: "Search... (tag: category:)" },
  "graph.animation": { ja: "アニメーション", en: "Animation" },
  "graph.stop": { ja: "停止", en: "Stop" },
  "graph.nodes": { ja: "ノード", en: "nodes" },
  "graph.connections": { ja: "接続", en: "links" },
  "graph.fusions": { ja: "融合", en: "fusions" },
  "graph.insights": { ja: "インサイト", en: "insights" },
  "graph.insightDiscovery": { ja: "新しいインサイト接続を発見しました", en: "New insight connections discovered" },

  // Graph - Ignition
  "graph.ignitionTemp": { ja: "発火温度", en: "Ignition temp" },
  "graph.collisions": { ja: "本の接続が衝突", en: "connections collide" },
  "graph.answerQuestion": { ja: "この問いに答えて新しいメモを生む", en: "Answer this question to create a new memo" },

  // Graph - Fusion
  "graph.fusionTitle": { ja: "ノード融合", en: "Node Fusion" },
  "graph.fusionDesc": { ja: "2つのメモをAIが融合し、新しいアイデアを生成します", en: "AI merges two memos to generate new ideas" },
  "graph.fusing": { ja: "融合中...", en: "Fusing..." },
  "graph.fuse": { ja: "融合する", en: "Fuse" },
  "graph.fusionCreative": { ja: "創造的融合", en: "Creative Fusion" },
  "graph.fusionTech": { ja: "技術的融合", en: "Technical Fusion" },
  "graph.fusionBusiness": { ja: "ビジネス融合", en: "Business Fusion" },
  "graph.fusionParents": { ja: "融合元メモ:", en: "Source memos:" },
  "graph.deleteFusion": { ja: "融合ノードを削除", en: "Delete fusion node" },
  "graph.viewDetail": { ja: "詳細を見る", en: "View detail" },

  // Graph - Settings
  "settings.title": { ja: "設定", en: "Settings" },
  "settings.filters": { ja: "フィルター", en: "Filters" },
  "settings.showTags": { ja: "タグ表示", en: "Show tags" },
  "settings.orphanNodes": { ja: "孤立ノード", en: "Orphan nodes" },
  "settings.insightLinks": { ja: "インサイト接続", en: "Insight links" },
  "settings.ignitionPoints": { ja: "発火ポイント", en: "Ignition points" },
  "settings.display": { ja: "表示", en: "Display" },
  "settings.arrows": { ja: "矢印", en: "Arrows" },
  "settings.labelSize": { ja: "文字サイズ", en: "Label size" },
  "settings.labelHidden": { ja: "非表示", en: "Hide" },
  "settings.labelS": { ja: "小", en: "S" },
  "settings.labelM": { ja: "中", en: "M" },
  "settings.labelL": { ja: "大", en: "L" },
  "settings.labelXL": { ja: "特大", en: "XL" },
  "settings.textThreshold": { ja: "テキスト表示閾値", en: "Text threshold" },
  "settings.nodeSize": { ja: "ノードサイズ", en: "Node size" },
  "settings.linkWidth": { ja: "リンクの太さ", en: "Link width" },
  "settings.forces": { ja: "フォース", en: "Forces" },
  "settings.centerForce": { ja: "中心引力", en: "Center gravity" },
  "settings.repelForce": { ja: "反発力", en: "Repel force" },
  "settings.linkForce": { ja: "リンク引力", en: "Link force" },
  "settings.linkDistance": { ja: "リンク距離", en: "Link distance" },
  "settings.rotation": { ja: "回転", en: "Rotation" },
  "settings.autoRotate": { ja: "自動回転", en: "Auto rotate" },
  "settings.rotateSpeed": { ja: "回転速度", en: "Rotate speed" },
  "settings.groups": { ja: "グループ", en: "Groups" },
  "settings.addGroup": { ja: "+ 追加", en: "+ Add" },
  "settings.searchQuery": { ja: "検索クエリ", en: "Search query" },

  // === Insights Page ===
  "insights.title": { ja: "インサイト分析", en: "Insight Analysis" },
  "insights.subtitle": { ja: "AIがメモ間の接続を見つけ、アイデアの種を生成します", en: "AI finds connections between memos and generates ideas" },
  "insights.analyzing": { ja: "AIが分析中...", en: "AI analyzing..." },
  "insights.analyze": { ja: "メモを分析してインサイトを生成", en: "Analyze memos to generate insights" },
  "insights.none": { ja: "まだインサイトがありません", en: "No insights yet" },
  "insights.noneHint": { ja: "上のボタンを押してメモの接続分析を実行してください", en: "Press the button above to analyze memo connections" },
  "insights.count": { ja: "件のインサイト", en: "insights" },
  "insights.fromMemos": { ja: "件のメモから", en: "from memos" },

  // === Thinking Page ===
  "thinking.title": { ja: "Thinking Lab", en: "Thinking Lab" },
  "thinking.subtitle": { ja: "メモを選択し、思考フレームワークで新しいアイデアを生み出す", en: "Select memos and generate new ideas with thinking frameworks" },
  "thinking.categories": { ja: "発想 / 整理 / 分析 / 計画", en: "Ideation / Organize / Analysis / Planning" },
  "thinking.selectMemos": { ja: "メモを選択", en: "Select memos" },
  "thinking.selectAll": { ja: "すべて選択", en: "Select all" },
  "thinking.selected": { ja: "件選択中", en: "selected" },
  "thinking.processing": { ja: "思考中...", en: "Thinking..." },
  "thinking.results": { ja: "結果", en: "Results" },
  "thinking.wordExport": { ja: "Word出力", en: "Word" },
  "thinking.googleDocs": { ja: "Google Docs", en: "Google Docs" },
  "thinking.minSelect": { ja: "2つ以上のメモを選択してください", en: "Please select 2 or more memos" },
  "thinking.generatedAt": { ja: "生成日:", en: "Generated:" },
  "thinking.actionItems": { ja: "アクションアイテム", en: "Action Items" },
  "thinking.coreIdea": { ja: "核心アイデア:", en: "Core Idea:" },
  "thinking.question": { ja: "問い:", en: "Question:" },
  "thinking.ideas": { ja: "アイデア:", en: "Ideas:" },
  "thinking.target": { ja: "分析対象:", en: "Analysis Target:" },
  "thinking.centerTheme": { ja: "中心テーマ:", en: "Center Theme:" },
  "thinking.title2": { ja: "タイトル:", en: "Title:" },
  "thinking.issue": { ja: "課題:", en: "Issue:" },

  // Thinking frameworks
  "fw.dialectic": { ja: "弁証法", en: "Dialectic" },
  "fw.dialecticDesc": { ja: "テーゼ→アンチテーゼ→ジンテーゼ", en: "Thesis → Antithesis → Synthesis" },
  "fw.scamper": { ja: "SCAMPER", en: "SCAMPER" },
  "fw.scamperDesc": { ja: "7つの視点でアイデア変形", en: "Transform ideas from 7 perspectives" },
  "fw.crossDomain": { ja: "異分野接続", en: "Cross-domain" },
  "fw.crossDomainDesc": { ja: "2つのフレームの交差点", en: "Intersection of two frames" },
  "fw.forcedConnect": { ja: "強制接続", en: "Forced Connect" },
  "fw.forcedConnectDesc": { ja: "無関係なメモを強制的に結合", en: "Forcefully combine unrelated memos" },
  "fw.mandala": { ja: "マンダラート", en: "Mandala Chart" },
  "fw.mandalaDesc": { ja: "9マスで思考を展開", en: "Expand thinking in 9 cells" },
  "fw.logicTree": { ja: "ロジックツリー", en: "Logic Tree" },
  "fw.logicTreeDesc": { ja: "課題を論理的に分解", en: "Logically decompose issues" },
  "fw.swot": { ja: "SWOT分析", en: "SWOT Analysis" },
  "fw.swotDesc": { ja: "強み/弱み/機会/脅威", en: "Strengths/Weaknesses/Opportunities/Threats" },
  "fw.bmc": { ja: "ビジネスモデル", en: "Business Model" },
  "fw.bmcDesc": { ja: "9要素のキャンバス", en: "9-element canvas" },
  "fw.lean": { ja: "リーンキャンバス", en: "Lean Canvas" },
  "fw.leanDesc": { ja: "スタートアップ向け計画", en: "Startup planning" },
  "fw.catIdeation": { ja: "発想", en: "Ideation" },
  "fw.catOrganize": { ja: "整理", en: "Organize" },
  "fw.catAnalysis": { ja: "分析", en: "Analysis" },
  "fw.catPlanning": { ja: "計画", en: "Planning" },

  // SWOT specific
  "swot.strengths": { ja: "強み (Strengths)", en: "Strengths" },
  "swot.weaknesses": { ja: "弱み (Weaknesses)", en: "Weaknesses" },
  "swot.opportunities": { ja: "機会 (Opportunities)", en: "Opportunities" },
  "swot.threats": { ja: "脅威 (Threats)", en: "Threats" },
  "swot.crossStrategy": { ja: "クロスSWOT戦略", en: "Cross-SWOT Strategy" },

  // Dialectic specific
  "dialectic.thesis": { ja: "テーゼ（正）:", en: "Thesis:" },
  "dialectic.antithesis": { ja: "アンチテーゼ（反）:", en: "Antithesis:" },
  "dialectic.synthesis": { ja: "ジンテーゼ（合）:", en: "Synthesis:" },

  // === Usage Page ===
  "usage.title": { ja: "API使用量・料金", en: "API Usage & Cost" },
  "usage.todayCost": { ja: "今日のコスト", en: "Today's Cost" },
  "usage.todayRequests": { ja: "リクエスト", en: "Requests" },
  "usage.monthCost": { ja: "今月のコスト", en: "This Month's Cost" },
  "usage.monthRequests": { ja: "リクエスト", en: "Requests" },
  "usage.todayTokens": { ja: "今日のトークン", en: "Today's Tokens" },
  "usage.monthTokens": { ja: "今月のトークン", en: "This Month's Tokens" },
  "usage.input": { ja: "入力", en: "Input" },
  "usage.output": { ja: "出力", en: "Output" },
  "usage.dailyChart": { ja: "日別コスト推移", en: "Daily Cost Trend" },
  "usage.modelBreakdown": { ja: "モデル別内訳（今月）", en: "Model Breakdown (This Month)" },
  "usage.noData": { ja: "まだ使用データがありません", en: "No usage data yet" },
  "usage.costNote": { ja: "コストはトークン数からの推定値です。実際の請求額とは多少異なる場合があります。", en: "Costs are estimates based on token counts. Actual charges may differ slightly." },
  "usage.fetchError": { ja: "データを取得できませんでした", en: "Failed to fetch data" },
  "usage.times": { ja: "回", en: "times" },

  // === Archive Page ===
  "archive.title": { ja: "月別アーカイブ", en: "Monthly Archive" },
  "archive.year": { ja: "年", en: "" },
  "archive.memoCount": { ja: "件のメモ", en: "memos" },
  "month.1": { ja: "1月", en: "Jan" },
  "month.2": { ja: "2月", en: "Feb" },
  "month.3": { ja: "3月", en: "Mar" },
  "month.4": { ja: "4月", en: "Apr" },
  "month.5": { ja: "5月", en: "May" },
  "month.6": { ja: "6月", en: "Jun" },
  "month.7": { ja: "7月", en: "Jul" },
  "month.8": { ja: "8月", en: "Aug" },
  "month.9": { ja: "9月", en: "Sep" },
  "month.10": { ja: "10月", en: "Oct" },
  "month.11": { ja: "11月", en: "Nov" },
  "month.12": { ja: "12月", en: "Dec" },

  // === Storage Indicator ===
  "storage.title": { ja: "Supabase 使用量", en: "Supabase Usage" },
  "storage.used": { ja: "使用中", en: "used" },
  "storage.apiUsage": { ja: "API使用量 →", en: "API Usage →" },
} as const;

type TranslationKey = keyof typeof translations;

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "ja",
  setLang: () => {},
  t: (key) => translations[key]?.ja || key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("voice-diary-lang") as Lang) || "ja";
    }
    return "ja";
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("voice-diary-lang", newLang);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[key]?.[lang] || key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "ja" ? "en" : "ja")}
      className="px-2 py-1 text-[10px] rounded bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
      title={lang === "ja" ? "Switch to English" : "日本語に切り替え"}
    >
      {lang === "ja" ? "EN" : "日本語"}
    </button>
  );
}
