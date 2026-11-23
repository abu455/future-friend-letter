import type { Metadata } from "next";
import { Outfit, Noto_Sans_SC, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const noto = Noto_Sans_SC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "市场需求雷达与 AI 成交智能体，服务工业制造、外贸与设备销售团队。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${outfit.variable} ${noto.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AppShell>{children}</AppShell>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "#0B1F36",
              border: "1px solid rgba(61,220,255,0.2)",
              color: "#F2F7FF",
            },
          }}
        />
      </body>
    </html>
  );
}
