import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      profileComplete?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    profileComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    profileComplete?: boolean;
  }
}
