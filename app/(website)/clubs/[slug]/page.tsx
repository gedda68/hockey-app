import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CLUBS_DATA } from "../data";

type Params = Promise<{ slug: string }>;

export default async function ClubDetailsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const club = CLUBS_DATA.find((c) => c.slug === slug);

  if (!club) notFound();

  return (
    /* We use the inline style to pass the color to a CSS variable */
    <div
      className="min-h-screen"
      style={{ "--club-color": club.color } as React.CSSProperties}
    >
      {/* Hero Section with Dynamic Background */}
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
      <section className="max-w-4xl mx-auto py-12 px-4">
        <div className="card bg-base-100 shadow-xl -mt-20 border border-base-200">
          <div className="card-body">
            <h2
              className="card-title text-2xl"
              style={{ color: "var(--club-color)" }}
            >
              About the Club
            </h2>

            {/* Use dangerouslySetInnerHTML to render the markup */}
            <div
              className="text-xl text-base-content/70 max-w-2xl leading-relaxed"
              dangerouslySetInnerHTML={{ __html: club.about }}
            />

            <div className="divider"></div>

            <div className="card-actions justify-end mt-6">
              <button
                className="btn text-white border-none"
                style={{ backgroundColor: "var(--club-color)" }}
              >
                <Link href="/clubs">← Back to All Clubs</Link>
              </button>
              <button
                className="btn text-white border-none"
                style={{ backgroundColor: "var(--club-color)" }}
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
