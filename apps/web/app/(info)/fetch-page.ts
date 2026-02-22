const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface PageContent {
  title: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export async function fetchPageContent(slug: string): Promise<PageContent | null> {
  try {
    const res = await fetch(`${API_BASE}/api/pages/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.found) return null;
    return data.page as PageContent;
  } catch {
    return null;
  }
}
