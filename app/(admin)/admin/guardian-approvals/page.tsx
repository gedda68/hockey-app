// Parent/guardian inbox: roles and role requests for people you look after that wait on you.

"use client";

import RoleInvitations from "@/components/roles/RoleInvitations";

export default function GuardianApprovalsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#06054e]">Guardian approvals</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          People under 18 need a parent/guardian to approve a role before it goes ahead. Anything waiting for you is here.
        </p>
      </div>
      <RoleInvitations mode="guardian" showEmpty />
    </div>
  );
}
