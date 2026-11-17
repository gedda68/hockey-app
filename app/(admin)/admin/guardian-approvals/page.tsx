// Parent/guardian inbox: roles and role requests for people you look after that wait on you.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import RoleInvitations from "@/components/roles/RoleInvitations";

import PageHeader from "@/components/admin/PageHeader";
export default function GuardianApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => { if (user?.family && !user.family.hasChildren) router.replace("/admin/dashboard"); }, [user?.family, router]);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Family" title="Guardian approvals" subtitle="People under 18 need a parent/guardian to approve a role before it goes ahead. Anything waiting for you is here." />
      <RoleInvitations mode="guardian" showEmpty />
    </div>
  );
}
