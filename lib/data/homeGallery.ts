import { readdir } from "fs/promises";
import path from "path";
import { HOME_GALLERY_CATEGORY } from "@/lib/constants/homeGallery";

const ICONS_SEGMENT = path.join("public", "icons", HOME_GALLERY_CATEGORY);

export type HomeGallerySlide = {
  id: string;
  /** Placeholder slides only; omitted for uploaded photos */
  title?: string;
  subtitle?: string;
  /** Used when imageUrl is absent */
  gradient: string;
  imageUrl?: string;
};

const PLACEHOLDER_POOL: Omit<HomeGallerySlide, "id">[] = [
  {
    title: "Premier division",
    subtitle: "Match day",
    gradient: "from-emerald-600 to-[#06054e]",
  },
  {
    title: "Junior finals",
    subtitle: "Future stars",
    gradient: "from-amber-500 to-orange-700",
  },
  {
    title: "Community day",
    subtitle: "Come & try",
    gradient: "from-sky-600 to-indigo-900",
  },
  {
    title: "Representative",
    subtitle: "State pathways",
    gradient: "from-violet-600 to-[#06054e]",
  },
  {
    title: "Women's league",
    subtitle: "This season",
    gradient: "from-rose-600 to-[#06054e]",
  },
  {
    title: "Umpire development",
    subtitle: "Officials",
    gradient: "from-teal-600 to-slate-900",
  },
  {
    title: "Club hockey",
    subtitle: "From the grounds",
    gradient: "from-cyan-600 to-[#06054e]",
  },
];

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function listHomeGalleryImageUrls(): Promise<string[]> {
  const dir = path.join(process.cwd(), ICONS_SEGMENT);
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
      .map((f) => `/icons/${HOME_GALLERY_CATEGORY}/${f}`);
  } catch {
    return [];
  }
}

/** Random order each request; always `slotCount` slides (images + gradient placeholders). */
export async function getRandomHomeGallerySlides(
  slotCount = 7,
): Promise<HomeGallerySlide[]> {
  const urls = shuffle(await listHomeGalleryImageUrls());
  const placeholders = shuffle(
    PLACEHOLDER_POOL.map((p, idx) => ({ ...p, idx })),
  );

  const slides: HomeGallerySlide[] = [];
  for (let i = 0; i < slotCount; i++) {
    const url = urls[i];
    if (url) {
      const file = url.split("/").pop() ?? `img-${i}`;
      slides.push({
        id: `photo-${file}`,
        gradient: "from-slate-800 to-slate-950",
        imageUrl: url,
      });
    } else {
      const p = placeholders[i % placeholders.length];
      slides.push({
        id: `placeholder-${p.idx}-${i}`,
        title: p.title,
        subtitle: p.subtitle,
        gradient: p.gradient,
      });
    }
  }

  return slides;
}
