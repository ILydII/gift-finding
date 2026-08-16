import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

const LINKS = [
  { href: "/friends", label: "Friends" },
  { href: "/profile", label: "My profile" },
];

export async function Nav() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden>🎁</span>
          <span>Gift Finder</span>
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {user &&
            LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-foreground/70 transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          {user ? (
            <li className="ml-1 flex items-center gap-2">
              <span className="hidden text-foreground/50 sm:inline">
                {user.name ?? user.email}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-black/15 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </li>
          ) : (
            <li>
              <Link
                href="/signin"
                className="ml-1 rounded-md px-3 py-1.5 text-foreground/70 transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                Sign in
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
