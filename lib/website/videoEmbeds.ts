export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  embedUrl: string;
};

function isHttpUrl(url: URL): boolean {
  return url.protocol === "https:" || url.protocol === "http:";
}

function youtubeEmbed(url: URL): VideoEmbed | null {
  const host = url.hostname.toLowerCase();
  let id = "";

  if (host === "youtu.be") {
    id = url.pathname.replace("/", "").trim();
  } else if (host.endsWith("youtube.com")) {
    if (url.pathname.startsWith("/watch")) {
      id = (url.searchParams.get("v") ?? "").trim();
    } else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/embed/")[1]?.split("/")[0]?.trim() ?? "";
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/shorts/")[1]?.split("/")[0]?.trim() ?? "";
    }
  }

  if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
  return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
}

function vimeoEmbed(url: URL): VideoEmbed | null {
  const host = url.hostname.toLowerCase();
  if (!host.endsWith("vimeo.com")) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[0] ?? "";
  if (!id || !/^\d{6,}$/.test(id)) return null;
  return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` };
}

export function parseVideoEmbed(videoUrl: string | null | undefined): VideoEmbed | null {
  const raw = String(videoUrl ?? "").trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isHttpUrl(url)) return null;

  return youtubeEmbed(url) ?? vimeoEmbed(url);
}

