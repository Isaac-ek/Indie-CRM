import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      demoSlug?: string;
      demoExpiresAt?: number;
    };
  }
  interface User {
    demoSlug?: string;
    demoExpiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    demoSlug?: string;
    demoExpiresAt?: number;
  }
}
