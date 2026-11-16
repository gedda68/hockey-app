export default function NoAreaAccess({ what }: { what: string }) {
  return (
    <div className="max-w-xl mx-auto mt-16 rounded-3xl border border-slate-200 bg-white p-10 text-center">
      <p className="text-lg font-black text-[#06054e]">No access to {what}</p>
      <p className="mt-2 text-sm text-slate-500">
        Your current role doesn&apos;t include this area. If that looks wrong, ask an administrator of this organisation.
      </p>
    </div>
  );
}
