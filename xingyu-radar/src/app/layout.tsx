import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "星域需求雷达与成交智能体",
  description: "市场需求雷达与 AI 成交智能体一体化工作台",
  applicationName: "星域需求雷达",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#061426",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            className: "xingyu-toast",
          }}
        />
      </body>
    </html>
  );
}
