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
      <body>{children}</body>
    </html>
  );
}
