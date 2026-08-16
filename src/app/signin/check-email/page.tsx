// Auth.js verifyRequest page — shown right after a magic link is requested.
export default function CheckEmailPage() {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-20 text-center">
      <p className="text-4xl" aria-hidden>
        ✉️
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Check your email
      </h1>
      <p className="mt-2 text-foreground/60">
        We sent you a one-time sign-in link. It works once and expires in 24
        hours — you can close this tab.
      </p>
      <p className="mt-6 text-xs text-foreground/40">
        Running locally without an email provider? The link is printed in the
        terminal running <code className="font-mono">npm run dev</code>.
      </p>
    </div>
  );
}
