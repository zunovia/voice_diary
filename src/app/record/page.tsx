"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";

function RecordContent() {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      {prompt ? (
        <>
          <div className="text-xs text-orange-400 mb-2">発火した問い</div>
          <h1 className="text-lg font-bold mb-2 text-center px-4 max-w-md leading-relaxed"
            style={{ color: "hsl(40, 80%, 70%)" }}
          >
            {prompt}
          </h1>
          <p className="text-muted-foreground text-xs mb-8">
            この問いについて、声で考えを残してください
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold mb-2">Voice Memo</h1>
          <p className="text-muted-foreground text-sm mb-8">
            声でメモを残して、AIが自動で整理します
          </p>
        </>
      )}
      <VoiceRecorder />
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">読み込み中...</div>}>
      <RecordContent />
    </Suspense>
  );
}
