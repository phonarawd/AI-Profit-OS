import Link from "next/link";
import { T } from "../../copy/ko";

type Section = { title: string; body: string };

export function LegalDoc({
  title,
  intro,
  sections,
  showTax = true,
}: {
  title: string;
  intro: string;
  sections?: readonly Section[];
  showTax?: boolean;
}) {
  return (
    <main
      className="p-6 text-lux-text"
      data-testid="legal-doc"
      data-legal-emoji="0"
    >
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-lux-text-muted">{intro}</p>
      {sections?.map((s) => (
        <section key={s.title} className="mt-5">
          <h2 className="text-sm font-semibold">{s.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-lux-text-muted">
            {s.body}
          </p>
        </section>
      ))}
      {showTax ? (
        <p className="mt-6 text-xs text-lux-text-muted">{T.legal.taxDisclaimer}</p>
      ) : null}
      <p className="mt-2 text-xs text-lux-text-muted">
        {T.legal.operator.footerLine}
      </p>
      <Link
        href="/me/legal"
        className="mt-6 inline-block text-sm text-lux-accent underline"
      >
        {T.common.back}
      </Link>
    </main>
  );
}
