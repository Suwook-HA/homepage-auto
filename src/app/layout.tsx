import type { Metadata } from "next";

import { Footer } from "@/app/ui/footer";
import { Nav } from "@/app/ui/nav";
import { startLocalScheduler } from "@/lib/scheduler";
import { readProfile } from "@/lib/store";

import "./globals.css";

startLocalScheduler();

export const metadata: Metadata = {
  title: "하수욱 (Ha Suwook) | AI 표준화 연구자",
  description:
    "ETRI 선임연구원. AI 데이터 품질, 신뢰가능 AI, ISO/IEC·ITU-T 국제표준화 전문가.",
  openGraph: {
    type: "profile",
    locale: "ko_KR",
    alternateLocale: "en_US",
    siteName: "Ha Suwook — AI Standardization Researcher",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await readProfile();

  return (
    <html lang="ko">
      <head>
        {/* Prevent flash of unstyled content: apply stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('homepage-theme');if(t==='dark')document.documentElement.dataset.theme='dark';else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <Nav name={profile.name} localName={profile.localName} />
        {children}
        <Footer profile={profile} />
      </body>
    </html>
  );
}
