import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export default authConfig;
