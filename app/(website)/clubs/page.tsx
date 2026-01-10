import Image from "next/image";
import Link from "next/link";
import { getClubs } from "../../../lib/data/clubs";

export default async function ClubsPage() {
  // Fetch clubs from data layer
  const clubs = await getClubs();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-2">
          Clubs
        </h1>
        <p className="text-sm font-bold text-slate-600">
          Explore all Brisbane Hockey League clubs
        </p>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <div
            key={club.slug}
            className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            {/* Club Icon */}
            <div className="h-20 mb-4 flex items-center justify-center">
              {club.iconSrc ? (
                <Image
                  src={club.iconSrc}
                  alt={club.title}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              ) : (
                <span className="text-6xl">{club.icon}</span>
              )}
            </div>

            {/* Club Name */}
            <h2 className="text-xl font-black uppercase text-slate-900 mb-2 text-center">
              {club.title} ({club.abbreviation})
            </h2>

            {/* Description */}
            <p className="text-sm text-slate-600 text-center mb-4">
              {club.description}
            </p>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* About Button */}
              <Link
                href={`/clubs/${club.slug}`}
                className="block w-full text-center px-4 py-2 rounded-full text-sm font-black border-2 transition-all hover:opacity-90"
                style={{
                  borderColor: club.color,
                  backgroundColor: club.bgColor, // ← Added background color
                  color: "white", // ← Changed to white for contrast
                }}
              >
                About
              </Link>

              {/* Contact Button */}
              <Link
                href={`/clubs/${club.slug}/contact`}
                className="block w-full text-center px-4 py-2 rounded-full text-sm font-black border-2 transition-all"
                style={{
                  borderColor: club.color,
                  backgroundColor: club.bgColor, // ← Added background color
                  color: "white", // ← Changed to white for contrast
                }}
              >
                Contact
              </Link>

              {/* Website Button */}
              {club.href && (
                <a
                  href={club.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2 rounded-full text-sm font-black text-white transition-all"
                  style={{
                    backgroundColor: club.color,
                  }}
                >
                  Visit Website
                </a>
              )}
            </div>

            {/* Social Media */}
            <div className="flex justify-center gap-3 mt-4">
              {club.facebookUrl && (
                <a
                  href={club.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                  style={{ backgroundColor: club.color }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                  style={{ backgroundColor: club.color }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                  style={{ backgroundColor: club.color }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stats Section */}
      <div className="mt-12 bg-white rounded-3xl p-8 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
          <div>
            <div className="text-4xl font-black text-[#06054e] mb-2">
              {clubs.length}
            </div>
            <div className="text-xs font-black uppercase text-slate-400 tracking-wide">
              Total Clubs
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-[#06054e] mb-2">
              {clubs.filter((c) => c.contacts && c.contacts.length > 0).length}
            </div>
            <div className="text-xs font-black uppercase text-slate-400 tracking-wide">
              Clubs with Contact Info
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
