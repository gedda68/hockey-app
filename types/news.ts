// types/news.ts
// News item types

export interface NewsItem {
  _id: string;
  id: string;
  title: string;
  content: string;
  image?: string;
  imageUrl?: string;
  publishDate: Date | string;
  expiryDate: Date | string;
  author?: string;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NewsItemCreate {
  title: string;
  content: string;
  image?: string;
  publishDate: Date | string;
  expiryDate: Date | string;
  author?: string;
  active?: boolean;
}

export interface NewsItemUpdate extends Partial<NewsItemCreate> {
  id: string;
}

// Helper to check if news item is active
export function isNewsActive(newsItem: NewsItem): boolean {
  const now = new Date();
  const publishDate = new Date(newsItem.publishDate);
  const expiryDate = new Date(newsItem.expiryDate);

  return newsItem.active && publishDate <= now && expiryDate >= now;
}

// Helper to get active news items
export function getActiveNews(newsItems: NewsItem[]): NewsItem[] {
  return newsItems
    .filter(isNewsActive)
    .sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime(),
    );
}
