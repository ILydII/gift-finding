import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BUDGET_BANDS,
  GIFTING_PHILOSOPHIES,
  PLANNING_STYLES,
  RISK_TOLERANCES,
} from "@/lib/constants";
import {
  savePersonalInfo,
  saveGiftingStyle,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
} from "@/app/profile/actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  birth_year: "That birth year doesn't look right — try a 4-digit year.",
  wishlist: "Give the item a short title (that's the only required field).",
};

const SAVED_COPY: Record<string, string> = {
  personal: "Saved.",
  style: "Saved — this shapes the gift ideas you get as a Giver.",
  wishlist: "Saved.",
};

// The signed-in user's own data: personal info (FR-2/3), gifting-style
// preferences (FR-24/25), and wishlist (FR-9/10/11). None of this is a
// first-screen ask — everything here is optional and edited at their own
// pace, which is why it lives here rather than in onboarding or the claim
// flow (PRD ruling #13).
export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const sp = await searchParams;
  const saved = typeof sp.saved === "string" ? sp.saved : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/profile")}`);
  }

  const [user, giftingStyle, wishlist] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.giftingStyleProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.wishlistItem.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!user) redirect("/signin");

  const philosophyTags: string[] = giftingStyle?.philosophyTags
    ? JSON.parse(giftingStyle.philosophyTags)
    : [];

  const currentBand = DEFAULT_BUDGET_BANDS.find(
    (b) =>
      b.min === (giftingStyle?.defaultBudgetMin ?? null) &&
      b.max === (giftingStyle?.defaultBudgetMax ?? null),
  )?.value;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Nothing here is a first-screen ask — fill in what&apos;s useful, skip
        the rest, come back any time.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-green-600/30 bg-green-600/5 px-4 py-3 text-sm">
          {SAVED_COPY[saved] ?? "Saved."}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          {ERROR_COPY[error] ?? "Something went wrong — try again."}
        </p>
      )}

      {/* Personal info (FR-2/3) — optional, city-level location only. */}
      <section className="mt-8 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">About you</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Helps friends give you age- and life-stage-appropriate ideas. All
          optional.
        </p>
        <form action={savePersonalInfo} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            Name
            <input
              name="name"
              defaultValue={user.name ?? ""}
              maxLength={60}
              className="rounded-lg border border-black/15 bg-background px-3 py-2 outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Birth year
            <input
              name="birthYear"
              type="number"
              inputMode="numeric"
              defaultValue={user.birthYear ?? ""}
              placeholder="1994"
              min={1900}
              max={new Date().getFullYear()}
              className="rounded-lg border border-black/15 bg-background px-3 py-2 outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Gender
            <input
              name="gender"
              defaultValue={user.gender ?? ""}
              maxLength={40}
              placeholder="Optional"
              className="rounded-lg border border-black/15 bg-background px-3 py-2 outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Location
            <input
              name="location"
              defaultValue={user.location ?? ""}
              maxLength={60}
              placeholder="City — that's all we need"
              className="rounded-lg border border-black/15 bg-background px-3 py-2 outline-none transition focus:border-foreground/40 dark:border-white/20"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      {/* Gifting style (FR-24/25) — shapes recommendations when you're the Giver. */}
      <section className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">How you like to give</h2>
        <p className="mt-1 text-sm text-foreground/60">
          The short quiz from before your first set of gift ideas — edit it
          any time.
        </p>
        <form action={saveGiftingStyle} className="mt-4 flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium">Usual budget</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_BUDGET_BANDS.map((b) => (
                <label key={b.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="budgetBand"
                    value={b.value}
                    defaultChecked={currentBand === b.value}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-black/15 px-3.5 py-1.5 text-sm transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background dark:border-white/20">
                    {b.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Gifting philosophy</p>
            <p className="text-xs text-foreground/50">Pick any that fit.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GIFTING_PHILOSOPHIES.map((p) => (
                <label key={p.value} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="philosophy"
                    value={p.value}
                    defaultChecked={philosophyTags.includes(p.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-black/15 px-3.5 py-1.5 text-sm transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background dark:border-white/20">
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Planning style</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLANNING_STYLES.map((p) => (
                <label key={p.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="planningStyle"
                    value={p.value}
                    defaultChecked={giftingStyle?.planningStyle === p.value}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-black/15 px-3.5 py-1.5 text-sm transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background dark:border-white/20">
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Risk tolerance</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RISK_TOLERANCES.map((r) => (
                <label key={r.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="riskTolerance"
                    value={r.value}
                    defaultChecked={giftingStyle?.riskTolerance === r.value}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-black/15 px-3.5 py-1.5 text-sm transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background dark:border-white/20">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              Save preferences
            </button>
          </div>
        </form>
      </section>

      {/* Wishlist (FR-9/10/11) — optional and secondary, never part of the
          claim flow; this is its home (PRD ruling #13). */}
      <section id="wishlist" className="mt-6 rounded-xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">Your wishlist</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Specific things you&apos;ve got your eye on. Optional — friends have
          plenty to go on without it.
        </p>

        {wishlist.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {wishlist.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-black/10 p-4 dark:border-white/10"
              >
                <form
                  action={updateWishlistItem.bind(null, item.id)}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <input
                    name="title"
                    defaultValue={item.title}
                    required
                    maxLength={120}
                    placeholder="Title"
                    className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20 sm:col-span-2"
                  />
                  <input
                    name="link"
                    type="url"
                    defaultValue={item.link ?? ""}
                    placeholder="Link (optional)"
                    className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
                  />
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={item.price ?? ""}
                    placeholder="Price (optional)"
                    className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
                  />
                  <textarea
                    name="description"
                    defaultValue={item.description ?? ""}
                    rows={2}
                    maxLength={500}
                    placeholder="Description (optional)"
                    className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20 sm:col-span-2"
                  />
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <div className="flex gap-3 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          defaultChecked={item.visibility === "public"}
                        />
                        Visible to friends
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          defaultChecked={item.visibility === "private"}
                        />
                        Just for me
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-md border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
                <form action={deleteWishlistItem.bind(null, item.id)} className="mt-1">
                  <button
                    type="submit"
                    className="text-xs text-foreground/50 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addWishlistItem}
          className="mt-5 grid gap-2 rounded-lg border border-dashed border-black/15 p-4 sm:grid-cols-2 dark:border-white/20"
        >
          <p className="text-sm font-medium sm:col-span-2">Add something</p>
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Title — the only required field"
            className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20 sm:col-span-2"
          />
          <input
            name="link"
            type="url"
            placeholder="Link (optional)"
            className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
          />
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Price (optional)"
            className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20"
          />
          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Description (optional)"
            className="rounded-md border border-black/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 dark:border-white/20 sm:col-span-2"
          />
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="visibility" value="public" defaultChecked />
                Visible to friends
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="visibility" value="private" />
                Just for me
              </label>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Add
            </button>
          </div>
        </form>
      </section>

      <p className="mt-8 text-center text-sm text-foreground/50">
        <Link href="/friends" className="underline underline-offset-2">
          Back to your friends
        </Link>
      </p>
    </div>
  );
}
