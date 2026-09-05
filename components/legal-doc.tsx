import Link from "next/link";
import { LEGAL_DOCS, formatLegalDate, legalPath, type LegalDoc } from "@/lib/legal";

// Altı yasal metnin ortak kabuğu. İçerik lib/legal.ts'te veri olarak duruyor;
// burada yalnızca nasıl görüneceği var — böylece bir maddeyi değiştirmek için
// JSX'e dokunmak gerekmiyor.

function Section({ section }: { section: LegalDoc["sections"][number] }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-xl font-bold tracking-tight">{section.heading}</h2>

      {section.paragraphs?.map((text) => (
        <p key={text} className="mt-3 leading-relaxed text-ink-soft">
          {text}
        </p>
      ))}

      {section.list && (
        <ul className="mt-3 space-y-2">
          {section.list.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-ink-soft">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-paprika" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.rows && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.label} className="border-b border-line/60 last:border-0 align-top">
                  <th scope="row" className="w-[38%] px-5 py-3 text-left font-semibold">
                    {row.label}
                  </th>
                  <td className="px-5 py-3 leading-relaxed text-ink-soft">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.footnotes?.map((text) => (
        <p key={text} className="mt-4 text-sm leading-relaxed text-ink-soft">
          {text}
        </p>
      ))}
    </section>
  );
}

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  const others = LEGAL_DOCS.filter((other) => other.slug !== doc.slug);

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:py-24">
      <Link
        href="/yasal"
        className="font-mono text-[11px] uppercase tracking-wider text-paprika transition-colors hover:text-paprika-deep"
      >
        ← Yasal metinler
      </Link>

      <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight md:text-5xl">{doc.title}</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        Yürürlük tarihi: {formatLegalDate(doc.updated)}
      </p>

      <div className="mt-6 space-y-3 border-l-2 border-paprika/40 pl-5">
        {doc.intro.map((text) => (
          <p key={text} className="leading-relaxed">
            {text}
          </p>
        ))}
      </div>

      <div className="mt-12">
        {doc.sections.map((section) => (
          <Section key={section.heading} section={section} />
        ))}
      </div>

      <nav className="mt-16 border-t border-line pt-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Diğer metinler</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={legalPath(other.slug)}
                className="text-sm font-semibold transition-colors hover:text-paprika"
              >
                {other.navLabel}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
