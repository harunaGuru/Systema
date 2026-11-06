import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
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
  const appearance = {
    theme: dark,
    variables: {
      colorPrimary: "var(--color-accent-primary)",
      colorBackground: "var(--color-bg-surface)",
      colorText: "var(--color-text-primary)",
      colorTextSecondary: "var(--color-text-muted)",
      colorInputBackground: "var(--color-bg-elevated)",
      colorInputText: "var(--color-text-primary)",
      borderRadius: "var(--radius-md)",
    },
    elements: {
      formButtonPrimary: "bg-accent-primary text-bg-base",
      card: "bg-bg-surface border border-border-default",
      headerTitle: "text-text-primary",
      headerSubtitle: "text-text-muted",
    },
  };

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable, "font-sans")} lang="en">
      <body>
        <ClerkProvider appearance={appearance} afterSignOutUrl="/sign-in">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
