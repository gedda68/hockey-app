// types/next-auth.d.ts
// Extend NextAuth types with custom fields

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "superadmin" | "clubadmin" | "member";
    clubId?: string | null;
    memberId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "superadmin" | "clubadmin" | "member";
      clubId?: string | null;
      memberId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    clubId?: string | null;
    memberId?: string | null;
  }
}
