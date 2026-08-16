import {
  signInWithMagicLink,
  signInWithGoogle,
  signInWithPassword,
  registerWithPassword,
} from "@/lib/auth-actions";

// The inline account block (PRD §5 "craft constraint"): rendered inside the
// send screen (G4), the Receiver's save screen (R2), and /signin — never as a
// standalone interstitial with its own route in the flow.
//
// Providers per the PRD: Google SSO (primary, when configured) + email magic
// link. The password form only renders in development, for the seeded demo
// account and quick multi-user testing.
export function AccountGate({
  redirectTo,
  headline,
  subline,
}: {
  redirectTo: string;
  headline: string;
  subline: string;
}) {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="font-semibold">{headline}</h2>
      <p className="mt-1 text-sm text-foreground/60">{subline}</p>

      <div className="mt-4 flex flex-col gap-3">
        {googleEnabled && (
          <form action={signInWithGoogle}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button
              type="submit"
              className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition hover:opacity-90"
            >
              Continue with Google
            </button>
          </form>
        )}

        <form action={signInWithMagicLink} className="flex flex-col gap-2">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label
            htmlFor="magic-email"
            className="text-sm font-medium text-foreground/80"
          >
            {googleEnabled ? "Or use your email" : "Your email"}
          </label>
          <div className="flex gap-2">
            <input
              id="magic-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-lg border border-black/15 bg-background px-3 py-2.5 outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
            <button
              type="submit"
              className={
                googleEnabled
                  ? "rounded-lg border border-black/15 px-4 py-2.5 font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  : "rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition hover:opacity-90"
              }
            >
              Email me a link
            </button>
          </div>
          <p className="text-xs text-foreground/50">
            No password — we&apos;ll email you a one-time sign-in link.
          </p>
        </form>

        {isDev && (
          <details className="mt-1 rounded-lg border border-dashed border-black/15 p-3 text-sm dark:border-white/20">
            <summary className="cursor-pointer text-foreground/60">
              Dev only: password sign-in
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <form
                action={signInWithPassword}
                className="flex flex-col gap-2"
                id="dev-password-form"
              >
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="demo@example.com"
                  className="rounded-md border border-black/15 bg-background px-3 py-2 dark:border-white/20"
                />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="password123"
                  className="rounded-md border border-black/15 bg-background px-3 py-2 dark:border-white/20"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-md border border-black/15 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Sign in
                  </button>
                  <button
                    type="submit"
                    formAction={registerWithPassword}
                    className="rounded-md border border-black/15 px-3 py-1.5 text-foreground/60 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Create account &amp; sign in
                  </button>
                </div>
              </form>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
