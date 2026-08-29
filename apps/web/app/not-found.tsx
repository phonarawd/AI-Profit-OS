import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-6 text-pd-text">
      <h1 className="text-xl font-semibold">찾는 화면이 없어요</h1>
      <p className="mt-2 text-sm text-pd-text-muted">주소가 바뀌었거나 좀 더 이상 없어요.</p>
      <Link href="/" className="mt-4 inline-flex touch-target items-center rounded-pd-md bg-pd-accent px-4 font-semibold text-pd-bg">
        홈으로
      </Link>
    </main>
  );
}
