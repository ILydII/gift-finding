import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/friends", label: "Friends" },
  { href: "/friends/new", label: "Add a friend" },
  { href: "/profile", label: "My profile" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden>🎁</span>
          <span>Gift Finder</span>
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-md px-3 py-1.5 text-foreground/70 transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/signin"
              className="ml-1 rounded-md bg-foreground px-3 py-1.5 font-medium text-background transition hover:opacity-90"
            >
              Sign in
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
