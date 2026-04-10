"use client";

import { ReactNode } from "react";
import { I18nProvider, useI18n, LanguageToggle } from "@/lib/i18n";

function NavItem({ href, icon, labelKey }: { href: string; icon: string; labelKey: string }) {
  const { t } = useI18n();
  const icons: Record<string, string> = {
    graph: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    thinking:
      "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
    insight:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  };
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-400 transition-colors"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
      </svg>
      <span className="text-[10px]">{t(labelKey as never)}</span>
    </a>
  );
}

function RecordButton() {
  const { t } = useI18n();
  return (
    <a href="/record" className="flex flex-col items-center gap-1 -mt-6">
      <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-400 transition-colors">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </div>
      <span className="text-[10px] text-red-400">{t("nav.record")}</span>
    </a>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <NavItem href="/" icon="graph" labelKey="nav.graph" />
        <NavItem href="/list" icon="list" labelKey="nav.list" />
        <RecordButton />
        <NavItem href="/thinking" icon="thinking" labelKey="nav.thinking" />
        <NavItem href="/insights" icon="insight" labelKey="nav.insights" />
      </div>
      <div className="absolute top-2 right-2">
        <LanguageToggle />
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </I18nProvider>
  );
}
