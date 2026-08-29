import { T } from "../../copy/ko";

/** §50.9 operator footer — DET license line */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      data-testid="site-footer"
      className={`border-t border-pd-border px-4 py-4 text-center text-xs text-pd-text-muted ${className}`.trim()}
    >
      <p>{T.operator.footer.line}</p>
      <p className="mt-1">{T.legal.operator.footerLine}</p>
    </footer>
  );
}
