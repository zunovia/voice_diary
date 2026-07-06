"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        window.location.replace("/");
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="bg-gray-800/50 rounded-xl p-8 w-full max-w-sm space-y-6 border border-gray-700/50"
      >
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Voice Diary Memo" className="w-16 h-16 rounded-2xl" />
          <h1 className="text-xl font-bold text-white">{t("login.title")}</h1>
          <p className="text-gray-400 text-sm text-center">{t("login.description")}</p>
        </div>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t("login.placeholder")}
          autoFocus
          className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />

        {error && (
          <p className="text-red-400 text-sm">{t("login.error")}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !key}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium"
        >
          {t("login.submit")}
        </button>
      </form>
    </div>
  );
}
