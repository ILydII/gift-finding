import { SectionStub } from "@/components/SectionStub";

// Auth entry. Auth.js is configured in src/lib/auth.ts (Credentials +
// Google-when-env-present, JWT sessions, Prisma adapter). This screen is the
// sign-in / sign-up UI that calls it.
export default function SignInPage() {
  return (
    <SectionStub
      title="Sign in"
      flow="FR-1 — Account creation, framed as 'save your progress'"
      brdRefs={["FR-1"]}
      description="Email/password and Google sign-in. Auth is already configured server-side; this is the form + sign-up flow. Account creation should be prompted only after the first gift-finding action, never as the opening ask."
      todos={[
        "Email/password form calling signIn('credentials', …) from src/lib/auth.ts",
        "Sign-up: create a User with a bcrypt passwordHash (claimStatus 'claimed')",
        "'Continue with Google' button (only render when AUTH_GOOGLE_ID is set)",
        "After an invite (Flow 4), link the new login to the pre-existing unclaimed record (FR-14)",
        "Demo login available now: demo@example.com / password123",
      ]}
    />
  );
}
