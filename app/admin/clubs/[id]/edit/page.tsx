// app/admin/clubs/[id]/edit/page.tsx
export default async function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Edit Club: {id}</h1>
      <p>If you see this, the route is working!</p>
    </div>
  );
}
