import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urban Renewal Intelligence Lab",
  description: "Explainable AI and quasi-causal evaluation platform for urban renewal effectiveness."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
