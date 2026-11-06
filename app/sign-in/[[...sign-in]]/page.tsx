import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";

export default function SignInPage() {
  return (
    <AuthPageLayout>
      <Suspense>
        <SignIn routing="path" path="/sign-in" />
      </Suspense>
    </AuthPageLayout>
  );
}
