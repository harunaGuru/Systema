import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { authAppearance } from "@/components/auth/auth-appearance";

export default function SignUpPage() {
  return (
    <AuthPageLayout>
      <Suspense>
        <SignUp routing="path" path="/sign-up" appearance={authAppearance} />
      </Suspense>
    </AuthPageLayout>
  );
}
