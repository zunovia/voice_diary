"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";
import { useI18n } from "@/lib/i18n";

function RecordContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      {prompt ? (
        <>
          <div className="text-xs text-orange-400 mb-2">{t("record.ignitionPrompt")}</div>
          <h1 className="text-lg font-bold mb-2 text-center px-4 max-w-md leading-relaxed"
            style={{ color: "hsl(40, 80%, 70%)" }}
          >
            {prompt}
          </h1>
          <p className="text-muted-foreground text-xs mb-8">
            {t("record.ignitionHint")}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold mb-2">{t("record.title")}</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {t("record.subtitle")}
          </p>
        </>
      )}
      <VoiceRecorder />
    </div>
  );
}

export default function RecordPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">{t("common.loading")}</div>}>
      <RecordContent />
    </Suspense>
  );
}
