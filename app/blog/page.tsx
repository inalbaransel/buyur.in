import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/chrome";
import { LandingTracker } from "@/components/landing-tracker";
import { formatPostDate, listPosts } from "@/lib/blog";
import type { BlogPost } from "@/lib/types";
import { OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

// Yazılar PocketBase'den okunuyor; liste 5 dakikada bir tazelenir.
export const revalidate = 300;

const BLOG_TITLE = "QR Menü ve Restoran Teknolojileri Blogu";
const BLOG_DESCRIPTION =
  "Restoran, kafe ve pastaneler için dijital menü, QR menü, menü mühendisliği ve satış artırma üzerine pratik yazılar.";

export const metadata: Metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: absoluteUrl("/blog"),
    siteName: SITE_NAME,
    locale: "tr_TR",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: BLOG_TITLE, description: BLOG_DESCRIPTION, images: [OG_IMAGE] },
};

function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-all duration-300 hover:-translate-y-0.5 hover:border-paprika/50 hover:shadow-[0_18px_40px_-24px_rgba(35,24,18,0.5)] ${
        featured ? "md:col-span-2 md:flex-row" : ""
      }`}
    >
      <div className={`relative shrink-0 overflow-hidden bg-crema ${featured ? "aspect-[16/9] md:aspect-auto md:w-1/2" : "aspect-[16/9]"}`}>
        {post.cover_url ? (
          <picture>
            <img
              src={post.cover_url}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </picture>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-extrabold text-paprika/30">
            buyur
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.tags?.length > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-paprika">{post.tags.slice(0, 2).join(" · ")}</p>
        )}
        <h2 className={`mt-2 font-display font-bold leading-tight transition-colors group-hover:text-paprika ${featured ? "text-2xl md:text-3xl" : "text-xl"}`}>
          {post.title}
        </h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>}
        <p className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
          {formatPostDate(post.published_at || post.updated)}
        </p>
      </div>
    </Link>
  );
}

export default async function BlogIndexPage() {
  const posts = await listPosts();
  const [first, ...rest] = posts;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">Blog</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Menünüzden daha fazlasını çıkarın
          </h1>
          <p className="mt-4 text-ink-soft">
            QR menüye geçiş, menü tasarımı, fiyatlama ve müşteri deneyimi üzerine restoran ve kafe işletmecileri için
            pratik yazılar.
          </p>
        </div>

        {first ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <PostCard post={first} featured />
            {rest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-20 text-center">
            <p className="font-display text-2xl font-bold">İlk yazılar yolda</p>
            <p className="max-w-md text-sm text-ink-soft">
              Bu arada menünüzü 5 dakikada dijitalleştirebilir ya da canlı demo menüyü inceleyebilirsiniz.
            </p>
            <Link
              href="/panel/register"
              data-track="cta_click"
              data-track-location="blog_index"
              data-track-cta="create_free"
              className="rounded-full bg-paprika px-7 py-3.5 font-mono text-[13px] uppercase tracking-wider text-paper transition-colors hover:bg-paprika-deep"
            >
              Ücretsiz menünü oluştur
            </Link>
          </div>
        )}
      </main>
      <Footer />
      <LandingTracker />
    </>
  );
}
