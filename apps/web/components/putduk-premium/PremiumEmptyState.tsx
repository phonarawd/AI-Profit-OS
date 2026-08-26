import type { ReactNode } from "react";

export function PremiumEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="pt-premium-empty" role="status">
      {icon != null ? (
        <div className="pt-premium-empty-icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="pt-premium-title">{title}</h2>
      <p className="pt-premium-description">{description}</p>
      {action != null ? <div>{action}</div> : null}
    </div>
  );
}
