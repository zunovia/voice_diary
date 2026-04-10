"use client";

import { useState, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

type RecorderState = "idle" | "recording" | "transcribing" | "processing" | "done";

export default function VoiceRecorder() {
  const { t } = useI18n();
  const [state, setState] = useState<RecorderState>("idle");
  const [transcription, setTranscription] = useState("");
  const [liveLevel, setLiveLevel] = useState(0);
  const [summary, setSummary] = useState<{
    title: string;
    summary: string;
    tags: string[];
    category: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError("");
      setTranscription("");
      setSummary(null);
      setDuration(0);
      setLiveLevel(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLiveLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError(t("record.micError"));
    }
  }, [t]);

  const stopRecording = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    analyserRef.current = null;
    setLiveLevel(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      setState("idle");
      return;
    }

    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        resolve(blob);
      };
      mediaRecorder.stop();
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;

    if (audioBlob.size < 1000) {
      setError(t("record.tooShort"));
      setState("idle");
      return;
    }

    setState("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error || t("record.transcribeError"));

      const text = transcribeData.text;
      setTranscription(text);

      if (!text.trim()) {
        setError(t("record.noSpeech"));
        setState("idle");
        return;
      }

      setState("processing");
      const summarizeRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const summarizeData = await summarizeRes.json();
      if (!summarizeRes.ok) throw new Error(summarizeData.error || t("record.summarizeError"));

      setSummary(summarizeData);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setState("idle");
    }
  }, [t]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const categoryColors: Record<string, string> = {
    ビジネス: "bg-blue-500/20 text-blue-300",
    技術: "bg-green-500/20 text-green-300",
    思想: "bg-purple-500/20 text-purple-300",
    生活: "bg-orange-500/20 text-orange-300",
    学習: "bg-cyan-500/20 text-cyan-300",
    健康: "bg-pink-500/20 text-pink-300",
    人間関係: "bg-yellow-500/20 text-yellow-300",
    クリエイティブ: "bg-rose-500/20 text-rose-300",
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="relative">
        {state === "recording" && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <div
              className="absolute inset-0 rounded-full border-4 border-red-400 transition-transform duration-100"
              style={{ transform: `scale(${1 + liveLevel * 0.4})`, opacity: 0.3 + liveLevel * 0.7 }}
            />
          </>
        )}
        <button
          onClick={state === "recording" ? stopRecording : startRecording}
          disabled={state === "transcribing" || state === "processing"}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            state === "recording"
              ? "bg-red-500 scale-110 shadow-2xl shadow-red-500/50"
              : state === "transcribing" || state === "processing"
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/30"
          }`}
        >
          {state === "recording" ? (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : state === "transcribing" || state === "processing" ? (
            <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>

      {state === "recording" && (
        <div className="text-3xl font-mono text-red-400">{formatTime(duration)}</div>
      )}

      <p className="text-gray-400 text-sm">
        {state === "idle" && t("record.tapToStart")}
        {state === "recording" && t("record.recording")}
        {state === "transcribing" && t("record.transcribing")}
        {state === "processing" && t("record.processing")}
        {state === "done" && t("record.done")}
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 w-full max-w-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {summary && (
        <div className="bg-gray-800/50 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700/50">
          <h3 className="text-lg font-bold text-white">{summary.title}</h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryColors[summary.category] || "bg-gray-500/20 text-gray-300"}`}
          >
            {summary.category}
          </span>
          <p className="text-gray-300 text-sm">{summary.summary}</p>
          <div className="flex flex-wrap gap-2">
            {summary.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded text-xs">
                #{tag}
              </span>
            ))}
          </div>
          <details className="text-gray-500 text-xs">
            <summary className="cursor-pointer hover:text-gray-300">{t("record.showOriginal")}</summary>
            <p className="mt-2 whitespace-pre-wrap">{transcription}</p>
          </details>
          <a
            href="/"
            className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
          >
            {t("record.backToGraph")}
          </a>
        </div>
      )}
    </div>
  );
}
