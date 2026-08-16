import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountGate } from "@/components/AccountGate";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  invalid_email: "That doesn't look like an email address — try again?",
  email_send: "We couldn't send the sign-in link. Give it another try.",
  bad_credentials: "That email/password combination didn't match.",
  invalid_register: "Use a valid email and a password of at least 8 characters.",
  email_taken: "That email already has an account — sign in instead.",
};

// Standalone sign-in, for returning users ("Already have an account?"). New
// users never need this page — their account is created inline at the send
// screen (G4) or the claim screen (R2), per the PRD.
export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "/friends";
  const error = typeof params.error === "string" ? params.error : null;

  const session = await auth();
  if (session?.user) redirect(callbackUrl.startsWith("/") ? callbackUrl : "/friends");

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Sign in to get back to your friends and gift ideas.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          {ERROR_COPY[error] ?? "Something went wrong signing you in. Try again."}
        </p>
      )}

      <div className="mt-6">
        <AccountGate
          redirectTo={callbackUrl}
          headline="Sign in"
          subline="Use the same email or Google account as last time."
        />
      </div>
    </div>
  );
}
