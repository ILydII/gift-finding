import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { startGiftSearch } from "@/app/give/actions";

export const dynamic = "force-dynamic";

// R3 (PRD §3B) — become a Giver, at the moment of peak goodwill. Deliberately
// the same prompt as the landing page: the loop closes visually.
export default async function WelcomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/invite/${token}/confirm`);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-20 text-center">
      <h1 className="text-balance text-4xl font-semibold tracking-tight">
        Done. Now — who do <em>you</em> need to find a gift for?
      </h1>
      <p className="mt-3 text-foreground/60">
        You just made it easy for a friend. Return the favor for someone.
      </p>

      <form
        action={startGiftSearch}
        className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
      >
        <input
          name="name"
          required
          maxLength={40}
          placeholder="First name or nickname"
          aria-label="Their first name"
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-background px-4 py-3 text-lg outline-none transition focus:border-foreground/40 dark:border-white/20"
        />
        <button
          type="submit"
          className="rounded-lg bg-foreground px-6 py-3 font-medium text-background transition hover:opacity-90"
        >
          Continue
        </button>
      </form>

      <Link
        href="/friends"
        className="mt-6 text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Not right now
      </Link>
    </div>
  );
}
