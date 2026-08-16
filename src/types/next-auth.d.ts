import type { DefaultSession } from "next-auth";

// Expose the user id on the session (populated in the auth `session` callback).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
