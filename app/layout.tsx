import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "systema",
  description: "systema",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={cn(GeistSans.variable, GeistMono.variable, "font-sans")} lang="en">
      <body>{children}</body>
    </html>
  );
}
