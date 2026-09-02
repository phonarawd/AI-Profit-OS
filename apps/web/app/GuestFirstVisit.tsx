import { T } from "@aipo/ui/copy/ko";
import "./guest-first-visit.css";

function BrandLockup() {
  return (
    <header className="gfv-brand">
      <p className="gfv-wordmark">
        {T.brand.consumer}
        <img src="/spark-dash/brand-spark.svg" alt="" />
      </p>
      <p className="gfv-tag">{T.landing.guestTag}</p>
    </header>
  );
}

/**
 * REL-105 게스트 앱 진입 화면.
 * HomeDesktop/HomeMobile geometry를 바꾸지 않는다.
 * /ads Landing3s가 아니다. 가입/로그인 진실 입구만 유지한다.
 */
export function GuestFirstVisit() {
  return (
    <div data-testid="guest-first-visit" className="gfv">
      <div className="gfv-atmosphere" aria-hidden>
        <span className="gfv-bloom gfv-bloom-a" />
        <span className="gfv-bloom gfv-bloom-b" />
      </div>
      <div className="gfv-stage">
        <BrandLockup />
        <div className="gfv-hero">
          <div className="gfv-copy">
            <h1 className="gfv-headline">
              {T.landing.guestHeadlineLines.map((line, index) => (
                <span key={line} className="gfv-headline-line">
                  {line}
                  {index === T.landing.guestHeadlineLines.length - 1 ? (
                    <img
                      className="gfv-headline-spark"
                      src="/spark-dash/headline-spark.svg"
                      alt=""
                    />
                  ) : null}
                </span>
              ))}
            </h1>
            <p className="gfv-lead">{T.landing.guestLead}</p>
            <div className="gfv-actions">
              <a href="/auth/signup" data-testid="guest-cta-signup" className="gfv-cta-primary">
                {T.landing.ctaJoin}
              </a>
              <a href="/auth/login" data-testid="guest-cta-login" className="gfv-cta-secondary">
                {T.landing.ctaLogin}
              </a>
            </div>
          </div>
          <div className="gfv-art" aria-hidden>
            <img className="gfv-halo" src="/spark-dash/hero-halo.svg" alt="" />
            <img className="gfv-bolt" src="/spark-dash/hero-lightning-neon.svg" alt="" />
          </div>
        </div>
        <ol className="gfv-points">
          {T.landing.guestPoints.map((point, index) => (
            <li key={point.title} className="gfv-point">
              <p className="gfv-point-index">{String(index + 1).padStart(2, "0")}</p>
              <p className="gfv-point-title">{point.title}</p>
              <p className="gfv-point-body">{point.body}</p>
            </li>
          ))}
        </ol>
        <p className="gfv-disclaimer">{T.landing.guestDisclaimer}</p>
        <footer className="gfv-foot">{T.legal.operator.footerLine}</footer>
      </div>
    </div>
  );
}

export function HomeSessionUnavailable() {
  return (
    <div data-testid="home-session-unavailable" className="gfv gfv--plain">
      <div className="gfv-stage gfv-stage--narrow">
        <BrandLockup />
        <h1 className="gfv-headline">{T.landing.guestUnavailableTitle}</h1>
        <p className="gfv-lead">{T.landing.guestUnavailableBody}</p>
        <div className="gfv-actions">
          <a href="/" className="gfv-cta-primary">{T.landing.guestRetry}</a>
          <a href="/auth/login" className="gfv-cta-secondary">{T.landing.ctaLogin}</a>
        </div>
      </div>
    </div>
  );
}
