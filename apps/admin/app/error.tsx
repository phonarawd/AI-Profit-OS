"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-6 text-pd-text">
      <h1 className="text-xl font-semibold">관리 화면을 불러오지 못했어요</h1>
      <button type="button" className="mt-4 rounded-pd-md bg-pd-accent px-4 py-2 text-pd-bg" onClick={() => reset()}>
        다시 시도
      </button>
    </main>
  );
}
