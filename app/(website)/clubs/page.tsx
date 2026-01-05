import Image from "next/image";
import { CLUBS_DATA } from "./data";
import Link from "next/link";

export default function ClubsPage() {
  return (
    <div className="py-2">
      <div className="text-center mb-5 bg-[#66667e] p-2 rounded-lg mx-4">
        <h1 className="text-4xl font-extrabold sm:text-3xl text-yellow-200">
          Clubs
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {CLUBS_DATA.map((club, index) => (
          <div
            key={index}
            className="card bg-base-200 shadow-xl transition-transform hover:-translate-y-2"
            style={{ "--club-color": club.bgColor } as React.CSSProperties}
          >
            <div className="card-body items-center text-center">
              <div className="h-16 mb-4 flex items-center justify-center">
                {club.iconSrc ? (
                  <Image
                    src={club.iconSrc}
                    alt={club.title}
                    width={64} // Slightly larger for better visibility
                    height={64}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-5xl">{club.icon}</span>
                )}
              </div>

              <h2 className="card-title">{club.title}</h2>
              <p>{club.description}</p>

              <div className="card-actions mt-4">
                <Link href={club.href || "#"} className="btn btn-ghost btn-sm">
                  Club Website
                </Link>
              </div>
              <div className="card-actions mt-4">
                <Link
                  href={club.xhref || "#"}
                  className="btn btn-outline"
                  style={{ borderColor: club.color, color: club.color }}
                >
                  {" "}
                  About
                </Link>
                <Link
                  href={`/clubs/${club.slug}/contact`}
                  className="btn btn-outline"
                  style={{ borderColor: club.color, color: club.color }}
                >
                  Club Contact
                </Link>
              </div>
              <div>
                <a
                  href={club.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-circle border-none text-white hover:brightness-110 shadow-lg"
                  style={{ backgroundColor: club.color }}
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Section */}
      <div className="flex justify-center mt-20">
        <div className="stats shadow bg-primary text-primary-content stats-vertical lg:stats-horizontal">
          <div className="stat">
            <div className="stat-title text-primary-content/70">Downloads</div>
            <div className="stat-value">31K</div>
            <div className="stat-desc text-primary-content/70">
              Jan 1st - Feb 1st
            </div>
          </div>
          <div className="stat border-primary-content/10">
            <div className="stat-title text-primary-content/70">New Users</div>
            <div className="stat-value">4,200</div>
            <div className="stat-desc text-primary-content/70">
              ↗︎ 400 (22%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
