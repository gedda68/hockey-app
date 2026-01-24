import Link from "next/link";

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Link
          href="/"
          className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group"
        >
          <span className="transition-transform group-hover:-translate-x-1">
            ←
          </span>
          Back to Home
        </Link>
      </div>

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-[#06054e] rounded-full mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h1 className="text-5xl font-black uppercase italic text-[#06054e] mb-4">
            BHL Shop
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Official Brisbane Hockey League merchandise, equipment, and apparel
          </p>
        </div>

        {/* Coming Soon Section */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center">
            <div className="mb-8">
              <div className="inline-block p-4 bg-yellow-100 rounded-full mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h2 className="text-3xl font-black uppercase text-[#06054e] mb-4">
                Coming Soon!
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Our online shop is currently under construction. In the
                meantime, please contact your club directly for merchandise
                inquiries.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="text-3xl mb-2">👕</div>
                <h3 className="text-sm font-black uppercase text-slate-900 mb-2">
                  Apparel
                </h3>
                <p className="text-xs text-slate-600">
                  Jerseys, training gear, and casual wear
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="text-3xl mb-2">🏑</div>
                <h3 className="text-sm font-black uppercase text-slate-900 mb-2">
                  Equipment
                </h3>
                <p className="text-xs text-slate-600">
                  Sticks, balls, protective gear, and accessories
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="text-3xl mb-2">🎁</div>
                <h3 className="text-sm font-black uppercase text-slate-900 mb-2">
                  Merchandise
                </h3>
                <p className="text-xs text-slate-600">
                  Bags, water bottles, hats, and more
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/clubs"
                className="px-8 py-4 bg-[#06054e] text-white rounded-full font-black uppercase text-sm hover:bg-[#0a0870] transition-all"
              >
                Contact Your Club
              </Link>
              <Link
                href="/about/contact"
                className="px-8 py-4 border-2 border-[#06054e] text-[#06054e] rounded-full font-black uppercase text-sm hover:bg-slate-50 transition-all"
              >
                Get Updates
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              For urgent merchandise inquiries, please email:{" "}
              <a
                href="mailto:shop@brisbanehockey.com"
                className="font-bold text-[#06054e] hover:underline"
              >
                shop@brisbanehockey.com
              </a>
            </p>
          </div>
        </div>

        {/* Club Links */}
        <div className="mt-16">
          <h2 className="text-2xl font-black uppercase text-[#06054e] mb-8 text-center">
            Shop at Your Club
          </h2>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <p className="text-center text-slate-600 mb-6">
              Many clubs have their own merchandise available. Visit your
              club&apos;s website for more information:
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/clubs/commercial-hockey"
                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 rounded-full text-sm font-bold text-slate-900 transition-all"
              >
                Commercial HC
              </Link>
              <Link
                href="/clubs/bulimba-hockey"
                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 rounded-full text-sm font-bold text-slate-900 transition-all"
              >
                Bulimba HC
              </Link>
              <Link
                href="/clubs/east-hockey"
                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 rounded-full text-sm font-bold text-slate-900 transition-all"
              >
                East HC
              </Link>
              <Link
                href="/clubs/norths-hockey"
                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 rounded-full text-sm font-bold text-slate-900 transition-all"
              >
                Norths HC
              </Link>
              <Link
                href="/clubs"
                className="px-6 py-3 bg-[#06054e] text-white hover:bg-[#0a0870] rounded-full text-sm font-bold transition-all"
              >
                View All Clubs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
