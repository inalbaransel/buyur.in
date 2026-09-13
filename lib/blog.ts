import { createServerPB } from "@/lib/pocketbase";
import type { BlogPost } from "@/lib/types";

// menuva blogu. Yazılar PocketBase yönetim ekranından `menuva_blog_posts`
// koleksiyonuna girilir (şema: scripts/setup-pocketbase.mjs). Koleksiyon henüz
// kurulmamışsa ya da erişilemiyorsa blog boş görünür, site bozulmaz.

export const BLOG_COLLECTION = "menuva_blog_posts";

const LIST_FIELDS = "id,title,slug,excerpt,cover_url,author,tags,published_at,updated";

export async function listPosts(limit = 60): Promise<BlogPost[]> {
  const pb = createServerPB();
  try {
    const result = await pb.collection(BLOG_COLLECTION).getList<BlogPost>(1, limit, {
      filter: "is_published = true",
      sort: "-published_at,-created",
      fields: LIST_FIELDS,
      requestKey: null,
    });
    return result.items;
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const pb = createServerPB();
  try {
    return await pb
      .collection(BLOG_COLLECTION)
      .getFirstListItem<BlogPost>(pb.filter("slug = {:slug} && is_published = true", { slug }), { requestKey: null });
  } catch {
    return null;
  }
}

/** İçeriği yalnızca yöneticiler yazıyor; yine de derinlemesine savunma olarak
 *  çalıştırılabilir etiketleri, olay niteliklerini ve javascript: adreslerini
 *  ayıklıyoruz. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|form|template|input|button|textarea|select|meta|link|base)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data):[^"']*\2/gi, '$1="#"');
}

export function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatPostDate(value: string): string {
  const date = new Date((value || "").replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
