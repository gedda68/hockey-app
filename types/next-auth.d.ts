// types/next-auth.d.ts
// Extend NextAuth types with custom fields

import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/lib/types/roles";

declare module "next-auth" {
  interface User {
    role: UserRole;
    associationId?: string | null;
    clubId?: string | null;
    memberId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      associationId?: string | null;
      clubId?: string | null;
      memberId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    associationId?: string | null;
    clubId?: string | null;
    memberId?: string | null;
  }
}
