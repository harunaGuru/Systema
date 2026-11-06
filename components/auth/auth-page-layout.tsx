import type { ReactNode } from "react";

type AuthPageLayoutProps = {
  children: ReactNode;
};

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center gap-12 px-6 py-10 lg:px-8">
      <aside className="hidden min-w-0 flex-1 lg:flex lg:items-center">
        <div className="max-w-lg space-y-6">
          <h1 className="font-sans text-5xl font-semibold tracking-tight text-text-primary xl:text-6xl">
            Systema
          </h1>
          <p className="max-w-md text-lg leading-7 text-text-muted">
            Design systems together, in real time.
          </p>
          <ul className="list-disc space-y-3 pl-5 text-base leading-7 text-text-muted marker:text-accent-primary">
            <li>Design systems together</li>
            <li>Collaborate in real time</li>
            <li>Keep every project organized</li>
          </ul>
        </div>
      </aside>
      <main className="flex w-full max-w-md shrink-0 items-center justify-center">
        {children}
      </main>
    </div>
  );
}
