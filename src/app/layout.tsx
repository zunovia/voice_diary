import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voice Diary Memo",
  description: "音声で記録し、AIが接続するナレッジダイアリー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <div className="flex-1 pb-20">{children}</div>
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 z-50">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
            <NavItem href="/" icon="graph" label="グラフ" />
            <NavItem href="/list" icon="list" label="リスト" />
            <RecordButton />
            <NavItem href="/archive" icon="archive" label="アーカイブ" />
            <NavItem href="/insights" icon="insight" label="分析" />
          </div>
        </nav>
      </body>
    </html>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const icons: Record<string, string> = {
    graph: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    archive:
      "M4 7V4a1 1 0 011-1h14a1 1 0 011 1v3M4 7h16M4 7l1 12a2 2 0 002 2h10a2 2 0 002-2l1-12M10 11h4",
    insight:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  };
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-1 text-gray-400 hover:text-indigo-400 transition-colors"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
      </svg>
      <span className="text-[10px]">{label}</span>
    </a>
  );
}

function RecordButton() {
  return (
    <a href="/record" className="flex flex-col items-center gap-1 -mt-6">
      <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-400 transition-colors">
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </div>
      <span className="text-[10px] text-red-400">録音</span>
    </a>
  );
}
