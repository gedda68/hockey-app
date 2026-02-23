// shared/SectionHeader.tsx
// Section title and description bar

interface SectionHeaderProps {
  title: string;
  description: string;
}

export default function SectionHeader({
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-2 h-8 bg-yellow-400 rounded-full" />
      <div>
        <h2 className="text-2xl font-black text-[#06054e]">{title}</h2>
        <p className="text-sm font-bold text-slate-400">{description}</p>
      </div>
    </div>
  );
}
