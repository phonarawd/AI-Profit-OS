"use client";

import { T } from "../../copy/ko";

export type CapitalVsWageCompareProps = {
  className?: string;
};

/** UI §38.7 Q4 — time-wage vs capital side-hustle compare */
export function CapitalVsWageCompare({
  className = "",
}: CapitalVsWageCompareProps) {
  const c = T.objections.compare;
  const rows = [
    { label: c.rowWhy, wage: c.wageWhy, capital: c.capitalWhy },
    { label: c.rowSource, wage: c.wageSource, capital: c.capitalSource },
    { label: c.rowRisk, wage: c.wageRisk, capital: c.capitalRisk },
  ];

  return (
    <div
      data-testid="capital-vs-wage-compare"
      className={`overflow-x-auto rounded-lux-md border border-lux-border ${className}`.trim()}
    >
      <p className="bg-lux-elevated px-3 py-2 text-sm font-medium text-lux-text">
        {c.title}
      </p>
      <table className="w-full min-w-[280px] border-collapse text-sm text-lux-text">
        <thead>
          <tr className="border-t border-lux-border text-left">
            <th className="p-3 font-medium" scope="col" />
            <th className="p-3 font-medium text-lux-text-muted" scope="col">
              {c.wageCol}
            </th>
            <th className="p-3 font-medium text-lux-accent" scope="col">
              {c.capitalCol}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-lux-border">
              <th
                className="p-3 text-left font-normal text-lux-text-muted"
                scope="row"
              >
                {row.label}
              </th>
              <td className="p-3 text-lux-text-muted">{row.wage}</td>
              <td className="p-3">{row.capital}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
