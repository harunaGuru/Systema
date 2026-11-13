import { shadcn } from "@clerk/ui/themes";

export const authAppearance = {
  theme: shadcn,
  options: { elevation: "flush" as const },
  elements: {
    rootBox: "w-full",
    card: "w-full border-none bg-transparent shadow-none",
    logoBox: "hidden",
    logoImage: "hidden",
    headerTitle: "text-text-primary",
    headerSubtitle: "text-text-muted",
    formFieldLabel: "text-sm font-medium text-text-primary",
    formFieldInput:
      "h-11 border-2 border-border-default bg-bg-elevated text-base text-text-primary placeholder:text-text-muted focus:border-accent-primary focus-visible:ring-2 focus-visible:ring-accent-primary/40",
    otpCodeFieldInput:
      "border border-border-default bg-bg-elevated text-lg font-semibold text-text-primary",
    formButtonPrimary:
      "h-11 bg-accent-primary text-base font-semibold text-bg-base hover:bg-accent-hover",
    socialButtonsBlockButton:
      "h-11 border border-border-default bg-bg-elevated text-base text-text-primary hover:bg-bg-surface",
    socialButtonsBlockButtonText: "text-base text-text-primary",
    dividerLine: "bg-border-subtle",
    dividerText: "text-text-muted",
    footerActionText: "text-text-muted",
    footerActionLink: "text-accent-primary hover:text-accent-hover",
  },
};
