import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/chrome";
import { LandingTracker } from "@/components/landing-tracker";
import { ArrowLeftIcon } from "@/components/icons";
import { formatPostDate, getPost, readingMinutes, sanitizeHtml } from "@/lib/blog";
import { ROOT_DOMAIN } from "@/lib/site";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `https://${ROOT_DOMAIN}/blog/${post.slug}`,
      publishedTime: post.published_at || undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
    twitter: {
      card: post.cover_url ? "summary_large_image" : "summary",
      title,
      description,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const html = sanitizeHtml(post.content ?? "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_url || undefined,
    datePublished: post.published_at || post.created,
    dateModified: post.updated,
    author: { "@type": "Organization", name: post.author || "menuva" },
    publisher: { "@type": "Organization", name: "menuva", logo: `https://${ROOT_DOMAIN}/menuva-icon.png` },
    mainEntityOfPage: `https://${ROOT_DOMAIN}/blog/${post.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14 md:py-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-ink-soft transition-colors hover:text-paprika"
        >
          <ArrowLeftIcon size={14} /> Tüm yazılar
        </Link>

        <article className="mt-8">
          {post.tags?.length > 0 && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-paprika">{post.tags.join(" · ")}</p>
          )}
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">{post.title}</h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            {[formatPostDate(post.published_at || post.created), `${readingMinutes(html)} dk okuma`, post.author]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {post.cover_url && (
            <picture>
              <img src={post.cover_url} alt="" className="mt-8 aspect-[16/9] w-full rounded-3xl object-cover" />
            </picture>
          )}

          {post.excerpt && <p className="mt-8 text-xl leading-relaxed text-ink-soft">{post.excerpt}</p>}

          <div className="blog-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        <aside className="mt-16 rounded-3xl bg-ink p-8 text-paper sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-wider text-paprika">menuva</p>
          <p className="mt-2 font-display text-2xl font-bold">Menünüzü güncel tutun, müşterinin seçimini kolaylaştırın.</p>
          <p className="mt-2 text-sm text-paper/70">Kredi kartı yok · 5 dakikada kurulum · İstediğin an bırak</p>
          <Link
            href="/panel/register"
            data-track="cta_click"
            data-track-location="blog_post"
            data-track-cta="create_free"
            className="mt-6 inline-flex rounded-full bg-paprika px-7 py-3.5 font-mono text-[13px] uppercase tracking-wider text-paper transition-colors hover:bg-paprika-deep"
          >
            Ücretsiz menünü oluştur
          </Link>
        </aside>
      </main>
      <Footer />
      <LandingTracker />
    </>
  );
}
