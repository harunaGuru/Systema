import type { ReactNode } from "react";
import { FolderOpen, Network, UsersRound } from "lucide-react";

type AuthPageLayoutProps = {
  children: ReactNode;
};

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-20 h-80 w-80 rounded-full bg-node-violet/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-accent-primary/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-ai/5 blur-3xl" />
      </div>

      <div className="floating-panel relative z-10 grid w-full max-w-5xl items-center gap-8 rounded-lg border-border-default ring-1 ring-text-primary/10 p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-12">
        <aside className="hidden min-w-0 flex-col items-start lg:flex">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-accent-primary">
            System design, together
          </p>
          <h1 className="font-sans text-5xl font-semibold tracking-tight text-text-primary xl:text-6xl">
            Systema
          </h1>
          <p className="mt-5 max-w-md text-lg leading-7 text-text-muted">
            Design systems together, in real time.
          </p>
          <ul className="mt-10 space-y-5 text-base text-text-primary">
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-bg-elevated text-accent-primary">
                <Network className="h-5 w-5" />
              </span>
              <span>Design systems together</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-bg-elevated text-accent-primary">
                <UsersRound className="h-5 w-5" />
              </span>
              <span>Collaborate in real time</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-bg-elevated text-accent-primary">
                <FolderOpen className="h-5 w-5" />
              </span>
              <span>Keep every project organized</span>
            </li>
          </ul>
        </aside>

        <main className="w-full min-w-0">
          <div className="mb-6 lg:hidden">
            <p className="text-xl font-semibold tracking-tight text-text-primary">Systema</p>
            <p className="mt-1 text-sm text-text-muted">Design systems together, in real time.</p>
          </div>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
