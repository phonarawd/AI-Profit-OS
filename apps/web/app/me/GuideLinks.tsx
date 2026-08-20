import Link from "next/link";

const GUIDES = [
  { href: "/me/guide/usdt", label: "테더 안내" },
  { href: "/me/guide/get-usdt", label: "테더 준비" },
  { href: "/me/guide/principal", label: "원금 안내" },
  { href: "/me/guide/revenue", label: "수익 안내" },
  { href: "/me/guide/faq", label: "자주 묻는 질문" },
  { href: "/me/guide/partners", label: "공식 협력" },
  { href: "/me/guide/market-weekly", label: "시세 안내" },
] as const;

export function GuideLinks() {
  return (
    <nav data-account-hub="guides-nav">
      {GUIDES.map((g) => (
        <p key={g.href}>
          <Link href={g.href}>{g.label}</Link>
        </p>
      ))}
      <p>
        <Link href="/me">내정보</Link>
      </p>
    </nav>
  );
}
