import Image from "next/image";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Text from "@/components/ui/Text";

export interface ByeItem { key: string; round: number; division?: string; teamName: string; icon?: string }

/** "Team v bye": no ground, no time and no match buttons. */
export default function ByeRow({ item, showDivision }: { item: ByeItem; showDivision?: boolean }) {
  return (
    <Card variant="default" className="p-0">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-6">
        <div className="flex min-w-[120px] flex-col items-start">
          <Badge variant="default" size="sm">{item.round}</Badge>
          {showDivision && item.division ? <Text variant="tiny" className="mt-1 font-black uppercase text-[#06054e]">{item.division}</Text> : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 md:gap-6">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <Text variant="h4" className="break-words text-right text-sm leading-tight md:text-base">{item.teamName}</Text>
            {item.icon ? (
              <div className="relative h-12 w-12 shrink-0"><Image src={item.icon} alt={item.teamName} fill sizes="48px" className="object-contain" /></div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-100" aria-hidden />
            )}
          </div>
          <span className="min-w-[84px] text-center text-sm font-black uppercase italic tracking-widest text-slate-400">v bye</span>
          <div className="min-w-0 flex-1" aria-hidden />
        </div>
      </div>
    </Card>
  );
}
