import { notFound } from "next/navigation";
import {
  PremiumCard,
  PremiumEmptyState,
  PremiumMetric,
  PremiumStatus,
  PremiumSurface,
} from "../../../components/putduk-premium";
import "./preview.css";

export default function PremiumSystemPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="pt-preview" data-testid="premium-system-preview">
      <header className="pt-preview-head">
        <p className="pt-premium-kicker">DEV VISUAL FIXTURE</p>
        <h1 className="pt-premium-title">Spark Dash × Toss Premium</h1>
        <p className="pt-premium-description">
          퍼뜩 전역 UI에 적용할 표면, 상태, 숫자 계층과 빈 화면의 개발 전용 프리뷰입니다.
        </p>
      </header>

      <PremiumSurface className="pt-preview-surface">
        <div className="pt-preview-row">
          <PremiumStatus label="진행 중" tone="live" live />
          <PremiumStatus label="완료" tone="success" />
          <PremiumStatus label="확인 필요" tone="warning" />
        </div>
        <div className="pt-preview-grid">
          <PremiumCard className="pt-preview-card" interactive>
            <PremiumMetric label="한눈에 보는 값" value="134.75" secondary="보조 정보는 한 단계 아래에 표시" />
          </PremiumCard>
          <PremiumCard className="pt-preview-card" interactive>
            <PremiumMetric label="진행 상태" value="3 / 5" secondary="실제 상태 데이터만 시각화" />
          </PremiumCard>
          <PremiumCard className="pt-preview-card" interactive>
            <PremiumMetric label="화면 원칙" value="쉽고 빠르게" secondary="PC와 모바일을 각각 최적화" />
          </PremiumCard>
        </div>
      </PremiumSurface>

      <PremiumSurface>
        <PremiumEmptyState
          icon={<span>✦</span>}
          title="아직 보여드릴 내용이 없어요"
          description="빈 화면도 막막하지 않게, 다음에 할 일을 이해하기 쉬운 문장으로 안내합니다."
        />
      </PremiumSurface>
    </main>
  );
}
