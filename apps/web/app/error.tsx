"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md p-6 text-pd-text">
      <h1 className="text-xl font-semibold">화면을 불러오지 못했어요</h1>
      <p className="mt-2 text-sm text-pd-text-muted">잠시 후 다시 시도해 주세요.</p>
      <button type="button" className="mt-4 touch-target rounded-pd-md bg-pd-accent px-4 font-semibold text-pd-bg" onClick={() => reset()}>
        다시 시도
      </button>
    </main>
  );
}
