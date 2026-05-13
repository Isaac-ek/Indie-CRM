import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import authConfig from "@/auth.config";
import { getPrismaClient } from "@/lib/prisma";

const demoEmail = "owner@northstarstudio.test";
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "demo12345";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        if (!process.env.DATABASE_URL) {
          if (email === demoEmail && password === demoPassword) {
            return {
              id: "demo-owner",
              email: demoEmail,
              name: "Chiemelie Ekezie",
            };
          }

          return null;
        }

        const prisma = getPrismaClient();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(password, user.passwordHash);

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }

      return session;
    },
  },
});
