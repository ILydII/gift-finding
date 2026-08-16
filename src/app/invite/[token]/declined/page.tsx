// Post-decline confirmation. Calm, final, nothing to do next.
export default function DeclinedPage() {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Done — you&apos;re out of it.
      </h1>
      <p className="mt-3 text-foreground/60">
        Everything recorded about you was deleted, and you won&apos;t get
        invited to this again.
      </p>
    </div>
  );
}
