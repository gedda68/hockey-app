import { MongoClient } from "mongodb";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Generate slug from club name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getClubBySlug(slug: string) {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    // Get all active clubs and find by slug
    const clubs = await clubsCollection.find({ active: true }).toArray();

    const club = clubs.find((c) => {
      const clubSlug = c.slug || generateSlug(c.name || c.title);
      return clubSlug === slug;
    });

    if (!club) return null;

    return {
      id: club.id,
      name: club.name || club.title,
      shortName: club.shortName || club.abbreviation,
      slug: club.slug || generateSlug(club.name || club.title),
      logo: club.logo || club.iconSrc,
      colors: club.colors || {
        primary: club.color || "#06054e",
        secondary: club.bgColor || "#090836",
      },
      contact: club.contact || {
        email: "",
        phone: "",
        website: club.href || "",
      },
      address: club.address || {
        street: "",
        suburb: "",
        state: "QLD",
        postcode: "",
        country: "Australia",
      },
      socialMedia: club.socialMedia || {
        facebook: club.facebookUrl || "",
        instagram: club.instagramUrl || "",
        twitter: club.twitterUrl || "",
      },
      committee: club.committee || club.contacts || [],
      homeGround: club.homeGround || "",
      established: club.established || "",
    };
  } finally {
    await client.close();
  }
}

export async function generateStaticParams() {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    const clubs = await clubsCollection.find({ active: true }).toArray();

    return clubs.map((club) => ({
      slug: club.slug || generateSlug(club.name || club.title),
    }));
  } finally {
    await client.close();
  }
}

export default async function ClubContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Club Branding */}
      <div
        className="relative h-48 bg-gradient-to-r overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${club.colors.primary}, ${club.colors.secondary})`,
        }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            {club.logo ? (
              <div className="w-20 h-20 bg-white rounded-2xl p-3 shadow-xl">
                <Image
                  src={club.logo}
                  alt={club.name}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl"
                style={{ backgroundColor: club.colors.secondary }}
              >
                {club.shortName?.substring(0, 3) || club.name.substring(0, 3)}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-black text-white drop-shadow-lg">
                CONTACT
              </h1>
              <p className="text-xl text-white/90 font-bold mt-1">
                {club.name}
              </p>
            </div>
          </div>

          {/* Back Button */}
          <Link
            href={`/clubs/${slug}`}
            className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full text-white font-black text-sm transition-all"
          >
            ← Back to Club
          </Link>
        </div>
      </div>

      {/* Contact Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Top Row - Contact & Location Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Get in Touch */}
          <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-6">
            <h2
              className="text-2xl font-black uppercase mb-6"
              style={{ color: club.colors.primary }}
            >
              Get in Touch
            </h2>
            <div className="space-y-4">
              {club.contact.email && (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📧</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Email
                    </p>
                    <a
                      href={`mailto:${club.contact.email}`}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold break-all"
                    >
                      {club.contact.email}
                    </a>
                  </div>
                </div>
              )}

              {club.contact.phone && (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📱</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Phone
                    </p>
                    <a
                      href={`tel:${club.contact.phone}`}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {club.contact.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-6">
            <h2
              className="text-2xl font-black uppercase mb-6"
              style={{ color: club.colors.primary }}
            >
              Location
            </h2>
            <div className="space-y-4">
              {club.homeGround && (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏟️</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Home Ground
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {club.homeGround}
                    </p>
                  </div>
                </div>
              )}

              {(club.address.street || club.address.suburb) && (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Address
                    </p>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {club.address.street && <p>{club.address.street}</p>}
                      {club.address.suburb && (
                        <p>
                          {club.address.suburb}, {club.address.state}{" "}
                          {club.address.postcode}
                        </p>
                      )}
                      {club.address.country && <p>{club.address.country}</p>}
                    </div>
                    {(club.address.street || club.address.suburb) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${club.address.street || ""} ${
                            club.address.suburb || ""
                          } ${club.address.state || ""} ${
                            club.address.postcode || ""
                          }`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Open in Google Maps →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Committee Table - Full Width Below */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 overflow-hidden">
          {/* Table Header with Club Colors */}
          <div
            className="px-6 py-4"
            style={{
              background: `linear-gradient(135deg, ${club.colors.primary}, ${club.colors.secondary})`,
            }}
          >
            <h2 className="text-2xl font-black uppercase text-white">
              Committee Members
              {club.committee.length > 0 && (
                <span className="ml-3 text-base opacity-90">
                  ({club.committee.length})
                </span>
              )}
            </h2>
          </div>

          {/* Table Content */}
          <div className="p-6">
            {club.committee.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-black text-slate-700 uppercase">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-black text-slate-700 uppercase">
                        Position
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-black text-slate-700 uppercase">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-black text-slate-700 uppercase">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.committee.map((member, index) => (
                      <tr
                        key={member.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900">
                            {member.name}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p
                            className="font-semibold text-sm"
                            style={{ color: club.colors.primary }}
                          >
                            {member.position}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all"
                            >
                              {member.email}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {member.phone ? (
                            <a
                              href={`tel:${member.phone}`}
                              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {member.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                No committee information available
              </p>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <Link
            href={`/clubs/${slug}`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-black transition-all hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${club.colors.primary}, ${club.colors.secondary})`,
            }}
          >
            ← Back to {club.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
