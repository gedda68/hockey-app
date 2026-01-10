import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getClubBySlug, getClubSlugs } from "../../../../lib/data/clubs";

type Params = Promise<{ slug: string }>;

// Generate static params for all clubs
export async function generateStaticParams() {
  const slugs = await getClubSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ClubDetailsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) notFound();

  return (
    <div
      className="min-h-screen"
      style={{ "--club-color": club.color } as React.CSSProperties}
    >
      {/* Hero Section with Dynamic Background */}
      <section
        className="py-20 text-white"
        style={{ backgroundColor: club.color }}
      >
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
          {/* Club Icon */}
          <div className="h-32 w-32 relative bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6">
            {club.iconSrc ? (
              <Image
                src={club.iconSrc}
                alt={club.title}
                fill
                className="object-contain p-2"
              />
            ) : (
              <span className="text-7xl">{club.icon}</span>
            )}
          </div>

          {/* Club Title */}
          <h1 className="text-5xl font-black drop-shadow-md uppercase">
            {club.title}
          </h1>

          {/* Description */}
          <p className="text-xl opacity-90 mt-4 max-w-2xl">
            {club.description}
          </p>

          {/* Social Media Icons */}
          <div className="flex gap-4 mt-6">
            {club.facebookUrl && (
              <a
                href={club.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9.101 24v-11.063h-3.642v-4.212h3.642v-3.103c0-3.607 2.199-5.617 5.448-5.617 1.556 0 3.181.278 3.181.278v3.503h-1.795c-1.787 0-2.344 1.109-2.344 2.247v2.692h3.948l-.631 4.212h-3.317v11.063h-4.842z" />
                </svg>
              </a>
            )}

            {club.instagramUrl && (
              <a
                href={club.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}

            {club.twitterUrl && (
              <a
                href={club.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl -mt-20 border-2 border-slate-200 p-8">
          {/* About Section */}
          <h2
            className="text-2xl font-black uppercase mb-4"
            style={{ color: club.color }}
          >
            About the Club
          </h2>

          {club.about ? (
            <div
              className="text-base text-slate-700 leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: club.about }}
            />
          ) : (
            <p className="text-slate-500 italic mb-6">
              No detailed information available yet.
            </p>
          )}

          {/* Address */}
          {club.address && (
            <div className="mb-6">
              <h3 className="text-sm font-black uppercase text-slate-400 mb-2">
                Address
              </h3>
              <p className="text-slate-700">{club.address}</p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t-2 border-slate-200 my-6"></div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/clubs"
              className="px-6 py-3 rounded-full text-sm font-black border-2 transition-all hover:shadow-lg"
              style={{
                borderColor: club.color,
                color: club.color,
              }}
            >
              ← Back to All Clubs
            </Link>

            <Link
              href={`/clubs/${club.slug}/contact`}
              className="px-6 py-3 rounded-full text-sm font-black text-white transition-all hover:shadow-lg"
              style={{
                backgroundColor: club.color,
              }}
            >
              Contact Club
            </Link>

            {club.href && (
              <a
                href={club.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full text-sm font-black text-white transition-all hover:shadow-lg"
                style={{
                  backgroundColor: club.color,
                }}
              >
                Visit Website →
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
