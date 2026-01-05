import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CLUBS_DATA } from "../../data";

type Params = Promise<{ slug: string }>;

export default async function ClubDetailsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const club = CLUBS_DATA.find((c) => c.slug === slug);

  if (!club) notFound();

  return (
    <div
      className="min-h-screen"
      style={{ "--club-color": club.color } as React.CSSProperties}
    >
      {/* Hero Section */}
      <section className="py-20 bg-[var(--club-color)] text-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
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
          <h1 className="text-5xl font-black drop-shadow-md">{club.title}</h1>
          <p className="text-xl opacity-90 mt-4 max-w-2xl">
            {club.description}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <div className="card bg-base-100 shadow-xl -mt-20 border border-base-200 overflow-hidden">
          <div className="card-body p-6 md:p-10">
            {/* TOP ROW: Location & Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="flex flex-col justify-center">
                <h2
                  className="text-2xl font-bold mb-4"
                  style={{ color: "var(--club-color)" }}
                >
                  Find Us
                </h2>
                <div
                  className="bg-base-200 p-6 rounded-2xl border-l-4"
                  style={{ borderColor: "var(--club-color)" }}
                >
                  <p className="font-bold text-lg mb-1">Clubhouse & Grounds</p>
                  <p className="text-base-content/70 whitespace-pre-line leading-relaxed">
                    {club.address || "Address details coming soon."}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      club.address || ""
                    )}`}
                    target="_blank"
                    className="btn btn-sm mt-4 text-white border-none"
                    style={{ backgroundColor: "var(--club-color)" }}
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>

              <div className="h-64 lg:h-80 w-full rounded-2xl overflow-hidden shadow-inner border border-base-300">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    club.address || ""
                  )}&output=embed`}
                ></iframe>
              </div>
            </div>

            <div className="divider"></div>

            {/* MIDDLE ROW: Club Contacts Table */}

            <div className="my-8">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--club-color)" }}
              >
                Club Contacts
              </h2>
              <div className="overflow-x-auto rounded-xl border border-base-200">
                <table className="table table-zebra w-full">
                  <thead className="bg-base-200">
                    <tr>
                      <th>Role</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.contacts?.map((person, index) => (
                      <tr key={index} className="hover">
                        <td className="font-bold text-xs uppercase tracking-widest opacity-60">
                          {person.role}
                        </td>
                        <td className="font-medium">{person.name}</td>
                        <td>
                          <a
                            href={`mailto:${person.email}`}
                            className="hover:underline"
                            style={{ color: "var(--club-color)" }}
                          >
                            {person.email}
                          </a>
                        </td>
                        <td>{person.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="divider"></div>

            {/* Final Actions */}
            <div className="card-actions justify-end mt-10 gap-4">
              <button
                className="btn px-8 text-white border-none"
                style={{ backgroundColor: "var(--club-color)" }}
              >
                <Link href="/clubs">← Back to Clubs</Link>
              </button>
              <button
                className="btn px-8 text-white border-none"
                style={{ backgroundColor: "var(--club-color)" }}
              >
                Join This Club
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
