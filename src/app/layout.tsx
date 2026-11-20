import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2026년 야베스 말씀암송 | MORIAH 아름다운 전승",
  description: "2026 야베스축복기도회 MORIAH 아름다운 전승 - 3주간 21개 말씀구절 암송 및 시험 모바일 홈페이지",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex justify-center bg-[#e5dec9]">
        <div className="w-full max-w-md min-h-screen bg-[#F6EFE5] shadow-2xl flex flex-col relative overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
