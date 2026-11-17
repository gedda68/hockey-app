// lib/social/facebook.ts — publishing to a Facebook Page through the Graph API (plain REST).
// A Page access token with pages_manage_posts is needed; it never leaves the server.

const GRAPH = "https://graph.facebook.com/v21.0";

async function graph<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, rest);
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) throw new Error(data?.error?.message?.slice(0, 200) || `Facebook returned ${res.status}`);
  return data;
}

/** Checks the token can see the page, and returns the page's name. */
export async function verifyPage(pageId: string, token: string): Promise<{ id: string; name: string }> {
  return graph<{ id: string; name: string }>(`/${encodeURIComponent(pageId)}?fields=id,name`, { token });
}

export async function postToPage(pageId: string, token: string, message: string, link?: string | null): Promise<string> {
  const body = new URLSearchParams({ message });
  if (link) body.set("link", link);
  const r = await graph<{ id: string }>(`/${encodeURIComponent(pageId)}/feed`, { token, method: "POST", body });
  return r.id;
}

export async function deletePagePost(postId: string, token: string): Promise<void> {
  await graph<{ success?: boolean }>(`/${encodeURIComponent(postId)}`, { token, method: "DELETE" });
}
