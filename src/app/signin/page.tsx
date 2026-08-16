import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountGate } from "@/components/AccountGate";
import { GradientShimmer } from "@/components/ui/gradient-shimmer";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  demo_name: "Enter a first name to continue.",
  demo: "Something went wrong — give it another try.",
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
      <div className="text-center">
        <GradientShimmer
          as="h1"
          gradient="sunrise"
          className="text-6xl font-semibold tracking-tight sm:text-7xl"
        >
          What Gift?
        </GradientShimmer>
        <p className="mt-4 text-sm text-foreground/60">
          {isInviteContext
            ? "Add your name to see what a friend's already figured out about you."
            : "Just your name to start — we'll set up your profile, then your friends."}
        </p>
      </div>

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
          headline="Get started"
          subline="No password, no email — just your first name and you're in."
        />
      </div>
    </div>
  );
}
