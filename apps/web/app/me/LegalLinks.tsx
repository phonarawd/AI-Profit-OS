import Link from "next/link";

const DOCS = [
  { href: "/me/legal/terms", label: "이용약관" },
  { href: "/me/legal/privacy", label: "개인정보" },
  { href: "/me/legal/license", label: "라이선스" },
  { href: "/me/legal/oss", label: "오픈소스" },
] as const;

export function LegalLinks() {
  return (
    <nav data-account-hub="legal-nav">
      {DOCS.map((d) => (
        <p key={d.href}>
          <Link href={d.href}>{d.label}</Link>
        </p>
      ))}
      <p>
        <Link href="/me">내정보</Link>
      </p>
    </nav>
  );
}
