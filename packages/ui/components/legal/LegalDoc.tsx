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
    <main data-testid="legal-doc" data-legal-emoji="0">
      <h1>{title}</h1>
      <p data-legal-intro="true">{intro}</p>
      {sections?.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}
      {showTax ? <p data-legal-note="tax">{T.legal.taxDisclaimer}</p> : null}
      <p data-legal-note="operator">{T.legal.operator.footerLine}</p>
      <Link href="/me/legal">{T.common.back}</Link>
    </main>
  );
}
