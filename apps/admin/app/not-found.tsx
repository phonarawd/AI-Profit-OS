import Link from "next/link";

export default function NotFound() {
  return (
    <main className="p-6 text-pd-text">
      <h1 className="text-xl font-semibold">찾는 관리 화면이 없어요</h1>
      <Link href="/admin" className="mt-4 inline-block text-pd-accent">관리 홈</Link>
    </main>
  );
}
