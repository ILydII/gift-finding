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

// The single front door for both entry points. Copy adapts to which one sent
// the visitor here (detected from callbackUrl) since "sign in" means a
// different thing depending on whether you arrived via an invite link or
// showed up to start your own gift search.
export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : "/";
  const error = typeof params.error === "string" ? params.error : null;
  const isInviteContext = callbackUrl.startsWith("/invite/");

  const session = await auth();
  if (session?.user) redirect(callbackUrl.startsWith("/") ? callbackUrl : "/");

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isInviteContext ? "A friend is getting you something." : "Let's get started."}
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        {isInviteContext
          ? "Sign in to see what they've already figured out about you."
          : "Sign in once, then tell us who you're shopping for."}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral dark:text-coral"
        >
          {ERROR_COPY[error] ?? "Something went wrong signing you in. Try again."}
        </p>
      )}

      <div className="mt-6">
        <AccountGate
          redirectTo={callbackUrl}
          headline="Sign in"
          subline="Google, or we'll email you a one-time link — either way, no password to remember."
        />
      </div>
    </div>
  );
}
