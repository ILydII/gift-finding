import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { absorbGuestDraft } from "@/lib/guest-merge";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Auth methods per the PRD (§5, decision log #10): Google SSO + email magic
// link — no user-facing passwords. The Credentials provider is kept as a
// dev-only path for the seeded demo account (hidden in production UI).
const providers: NextAuthConfig["providers"] = [
  // Magic link (provider id: "resend"). Delivery goes through src/lib/email —
  // real sends when RESEND_API_KEY is set, console logging otherwise, so the
  // full sign-in flow is walkable in local dev with no email infrastructure.
  Resend({
    from: process.env.EMAIL_FROM ?? "Gift Finder <onboarding@resend.dev>",
    async sendVerificationRequest({ identifier, url }) {
      await sendEmail({
        to: identifier,
        subject: "Your sign-in link for Gift Finder",
        text: [
          "Click to sign in — this link works once and expires in 24 hours.",
          "",
          url,
        ].join("\n"),
      });
    },
  }),
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Lets a user who first appeared as an email/magic-link (or unclaimed)
      // record link their Google login to the same account.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Trust the deployment host (Vercel sets the URL via VERCEL_URL). Required so
  // Auth.js accepts the callback URL in production behind the platform proxy.
  trustHost: true,
  // Credentials provider requires JWT sessions. OAuth accounts and magic-link
  // verification tokens are still persisted via the Prisma adapter.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", verifyRequest: "/signin/check-email" },
  providers,
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    // PRD FR-6: signing in from a guest session merges the draft into the
    // account, in place. Best-effort — a failed merge must never block auth
    // (the send action retries the merge before sending).
    async signIn({ user }) {
      try {
        if (user?.id) await absorbGuestDraft(user.id);
      } catch (err) {
        console.error("Guest draft merge on sign-in failed:", err);
      }
    },
  },
});
