import type { Metadata } from "next";

import { startLocalScheduler } from "@/lib/scheduler";

import "./globals.css";

startLocalScheduler();

export const metadata: Metadata = {
  title: "Auto Homepage",
  description: "Personal homepage with automatic content refresh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body>{children}</body>
    </html>
  );
}
