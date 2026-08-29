"use client";

import { T } from "../../copy/ko";

export type UsdtVsKrwCompareTableProps = {
  className?: string;
};

/** UI §38.2 — USDT vs KRW compare table */
export function UsdtVsKrwCompareTable({
  className = "",
}: UsdtVsKrwCompareTableProps) {
  const c = T.trust.compare;
  const rows: { label: string; usdt: string; krw: string }[] = [
    { label: c.speedLabel, usdt: c.speedUsdt, krw: c.speedKrw },
    { label: c.linkLabel, usdt: c.linkUsdt, krw: c.linkKrw },
    { label: c.recordLabel, usdt: c.recordUsdt, krw: c.recordKrw },
    { label: c.pickLabel, usdt: c.pickUsdt, krw: c.pickKrw },
  ];

  return (
    <div
      data-testid="usdt-vs-krw-compare"
      className={`overflow-x-auto rounded-pd-md border border-pd-border ${className}`.trim()}
    >
      <table className="w-full min-w-[280px] border-collapse text-sm text-pd-text">
        <thead>
          <tr className="bg-pd-elevated text-left">
            <th className="p-3 font-medium" scope="col" />
            <th className="p-3 font-medium text-pd-accent" scope="col">
              {c.colUsdt} {T.trust.usdt.recommendBadge}
            </th>
            <th className="p-3 font-medium" scope="col">
              {c.colKrw}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-pd-border">
              <th className="p-3 text-left font-normal text-pd-text-muted" scope="row">
                {row.label}
              </th>
              <td className="p-3">{row.usdt}</td>
              <td className="p-3 text-pd-text-muted">{row.krw}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
