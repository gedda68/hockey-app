"use client";

import ClubIcon from "@/components/ui/ClubIcon";

interface ClubsNavProps {
  clubs: any[];
  activeSlug?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ClubsNav({ clubs, activeSlug }: ClubsNavProps) {
  if (!clubs || clubs.length === 0) return null;

  return (
    <div className="w-full items-center">
      {/* Desktop */}
      <div className="hidden md:block w-full py-3">
        <div className="overflow-x-auto w-full">
          <div className="flex justify-center items-center gap-3 mx-auto w-max px-4">
            {clubs.map((club) => {
              const name = club.name || club.title;
              if (!name) return null;

              const slug = club.slug || generateSlug(name);

              return (
                <ClubIcon
                  key={slug}
                  name={name}
                  shortName={club.shortName}
                  slug={slug}
                  iconUrl={club.iconSrc || club.icon || club.logo}
                  primaryColor={club.colors?.primary}
                  variant="soft"
                  tooltip={name}
                  active={slug === activeSlug}
                  size="sm"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Accordion */}
      <details className="md:hidden border-t border-slate-200 py-2">
        <summary className="cursor-pointer text-sm font-bold text-slate-700 py-2">
          Clubs
        </summary>

        <div className="grid grid-cols-4 gap-3 py-3">
          {clubs.map((club) => {
            const name = club.name || club.title;
            if (!name) return null;

            const slug = club.slug || generateSlug(name);

            return (
              <ClubIcon
                key={slug}
                name={name}
                shortName={club.shortName}
                slug={slug}
                iconUrl={club.iconSrc || club.icon || club.logo}
                primaryColor={club.colors?.primary}
                variant="square"
                tooltip={name}
                size="xs"
              />
            );
          })}
        </div>
      </details>
    </div>
  );
}
