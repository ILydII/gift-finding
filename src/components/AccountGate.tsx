import {
  signInWithMagicLink,
  signInWithGoogle,
  signInWithPassword,
  registerWithPassword,
} from "@/lib/auth-actions";

// The combined sign-in screen — the single front door for both entry points
// (self-starting Giver, invited Receiver). One form: optional name/birth
// year alongside whichever provider button is pressed, via formAction (same
// pattern as the wishlist edit/delete forms and the dev sign-in/register
// buttons below) so every field submits regardless of which button is
// clicked.
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

      <form action={signInWithMagicLink} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div>
          <p className="text-sm font-medium text-foreground/80">About you</p>
          <p className="text-xs text-foreground/50">
            Optional — helps friends give you age-appropriate ideas. Skip it
            if you&apos;d rather.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              name="name"
              placeholder="First name"
              maxLength={60}
              className="rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
            <input
              name="birthYear"
              type="number"
              inputMode="numeric"
              placeholder="Birth year"
              min={1900}
              max={new Date().getFullYear()}
              className="rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {googleEnabled && (
            <button
              type="submit"
              formAction={signInWithGoogle}
              className="w-full rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition hover:opacity-90"
            >
              Continue with Google
            </button>
          )}

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
        </div>
      </form>

      {isDev && (
        <details className="mt-4 rounded-lg border border-dashed border-black/15 p-3 text-sm dark:border-white/20">
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
  );
}
