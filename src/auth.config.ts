import type { NextAuthConfig } from "next-auth";

const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export default authConfig;
