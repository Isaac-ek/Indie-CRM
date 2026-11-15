import type { NextAuthConfig } from "next-auth";

const authConfig = {
  secret: process.env.AUTH_SECRET ?? "indie-crm-default-auth-secret-key-32b",
  trustHost: true,
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.demoSlug = user.demoSlug;
        token.demoExpiresAt = user.demoExpiresAt;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        session.user.demoSlug = typeof token.demoSlug === "string" ? token.demoSlug : undefined;
        session.user.demoExpiresAt = typeof token.demoExpiresAt === "number" ? token.demoExpiresAt : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export default authConfig;
