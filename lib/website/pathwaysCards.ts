/**
 * B4 — “Play / Coach / Umpire / Volunteer” entry points with tenant-aware links
 * (registration + portal role requests).
 */

export type PathwaysTenantContext =
  | { kind: "platform" }
  | {
      kind: "club";
      clubId: string;
      clubSlug: string;
      clubName: string;
    }
  | {
      kind: "association";
      associationId: string;
      associationName: string;
    };

export type PathwayLink = { href: string; label: string };

export type PathwayCardModel = {
  id: "play" | "coach" | "umpire" | "volunteer";
  title: string;
  blurb: string;
  links: PathwayLink[];
};

function appendPortalQuery(path: string, portalQuery: string | null): string {
  if (!portalQuery?.trim() || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const [base, frag] = path.split("#");
  const join = base.includes("?") ? "&" : "?";
  const out = `${base}${join}portal=${encodeURIComponent(portalQuery.trim())}`;
  return frag ? `${out}#${frag}` : out;
}

/** Log in, then land on My registrations (role requests). */
export function myRegistrationsLoginUrl(roleQuery?: {
  role?: string;
  clubId?: string;
  associationId?: string;
}): string {
  const qs = new URLSearchParams();
  if (roleQuery?.role) qs.set("role", roleQuery.role);
  if (roleQuery?.clubId) qs.set("clubId", roleQuery.clubId);
  if (roleQuery?.associationId) qs.set("associationId", roleQuery.associationId);
  const dest = `/admin/my-registrations${qs.toString() ? `?${qs.toString()}` : ""}`;
  return `/login?callbackUrl=${encodeURIComponent(dest)}`;
}

export function buildPathwaysCards(
  ctx: PathwaysTenantContext,
  portalQuery: string | null,
): PathwayCardModel[] {
  const q = (path: string) => appendPortalQuery(path, portalQuery);

  const play: PathwayCardModel = {
    id: "play",
    title: "Play",
    blurb:
      ctx.kind === "club"
        ? `Register or renew as a player at ${ctx.clubName} for the current season.`
        : ctx.kind === "association"
          ? `Join a member club in ${ctx.associationName}, or explore representative opportunities.`
          : "Find a club and complete season registration, or browse representative programs.",
    links:
      ctx.kind === "club"
        ? [
            {
              href: q(`/clubs/${encodeURIComponent(ctx.clubSlug)}/register`),
              label: "Club registration",
            },
            { href: q("/competitions/my-fixtures"), label: "My fixtures" },
          ]
        : ctx.kind === "association"
          ? [
              {
                href: q(`/associations/${encodeURIComponent(ctx.associationId)}#member-clubs`),
                label: "Member clubs",
              },
              { href: q("/nominate"), label: "Representative nominations" },
              { href: q("/representative"), label: "Representative hub" },
            ]
          : [
              { href: q("/clubs"), label: "Club directory" },
              { href: q("/representative"), label: "Representative" },
            ],
  };

  const coach: PathwayCardModel = {
    id: "coach",
    title: "Coach",
    blurb:
      "Request a coaching role for approval (club or association scope). Sign in with the account linked to your member profile.",
    links:
      ctx.kind === "club"
        ? [
            {
              href: q(myRegistrationsLoginUrl({ role: "coach", clubId: ctx.clubId })),
              label: "Request coach role",
            },
          ]
        : ctx.kind === "association"
          ? [
              {
                href: q(
                  myRegistrationsLoginUrl({
                    role: "assoc-coach",
                    associationId: ctx.associationId,
                  }),
                ),
                label: "Request association coach role",
              },
              {
                href: q(myRegistrationsLoginUrl({ role: "coach" })),
                label: "Request club coach role",
              },
            ]
          : [{ href: q(myRegistrationsLoginUrl({ role: "coach" })), label: "Request coach role" }],
  };

  const umpire: PathwayCardModel = {
    id: "umpire",
    title: "Umpire",
    blurb:
      "Put your hand up as an umpire or technical official. Approvals and allocations are managed after your request is accepted.",
    links:
      ctx.kind === "club"
        ? [
            {
              href: q(myRegistrationsLoginUrl({ role: "umpire", clubId: ctx.clubId })),
              label: "Request umpire (club)",
            },
          ]
        : ctx.kind === "association"
          ? [
              {
                href: q(
                  myRegistrationsLoginUrl({
                    role: "umpire",
                    associationId: ctx.associationId,
                  }),
                ),
                label: "Request umpire (association)",
              },
            ]
          : [{ href: q(myRegistrationsLoginUrl({ role: "umpire" })), label: "Request umpire role" }],
  };

  const volunteer: PathwayCardModel = {
    id: "volunteer",
    title: "Volunteer",
    blurb:
      "Game-day duties (canteen, goal judge, table, setup) use the club duty roster — separate from the umpire register. Role requests (manager, committee, etc.) stay under My registrations.",
    links:
      ctx.kind === "club"
        ? [
            {
              href: q(
                `/clubs/${encodeURIComponent(ctx.clubSlug)}/volunteer-duties`,
              ),
              label: "Game-day duty roster (sign up)",
            },
            {
              href: q(myRegistrationsLoginUrl({ role: "volunteer", clubId: ctx.clubId })),
              label: "Request volunteer role (account)",
            },
          ]
        : ctx.kind === "association"
          ? [
              {
                href: q(`/clubs`),
                label: "Member clubs — open a hub → Volunteer duties",
              },
              {
                href: q(
                  myRegistrationsLoginUrl({
                    role: "assoc-committee",
                    associationId: ctx.associationId,
                  }),
                ),
                label: "Association committee / volunteer",
              },
              {
                href: q(myRegistrationsLoginUrl({ role: "volunteer" })),
                label: "Club volunteer (pick club after login)",
              },
            ]
          : [
              {
                href: q(`/clubs`),
                label: "Choose a club → Volunteer duties",
              },
              {
                href: q(myRegistrationsLoginUrl({ role: "volunteer" })),
                label: "Request volunteer role",
              },
            ],
  };

  return [play, coach, umpire, volunteer];
}
