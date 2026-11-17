// app/(admin)/admin/nominate/page.tsx
// Nominations inside the admin shell: first what you've been nominated for (and have nominated others for),
// then the teams and positions you can nominate for. One page, so there's no separate status lookup.

"use client";

import PageHeader from "@/components/admin/PageHeader";
import MyNominations from "@/components/nominations/MyNominations";
import NominatePortal from "@/components/nominations/NominatePortal";

export default function AdminNominatePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader eyebrow="Representative" title="Nominations" subtitle="What you've been nominated for, and the teams and positions you can nominate for." />
      <MyNominations />
      <h2 className="pt-2 text-xs font-black uppercase tracking-widest text-slate-400">Nominate for something</h2>
      <NominatePortal embedded />
    </div>
  );
}
