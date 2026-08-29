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
      className={`overflow-x-auto rounded-pd-md border border-pd-border ${className}`.trim()}
    >
      <p className="bg-pd-elevated px-3 py-2 text-sm font-medium text-pd-text">
        {c.title}
      </p>
      <table className="w-full min-w-[280px] border-collapse text-sm text-pd-text">
        <thead>
          <tr className="border-t border-pd-border text-left">
            <th className="p-3 font-medium" scope="col" />
            <th className="p-3 font-medium text-pd-text-muted" scope="col">
              {c.wageCol}
            </th>
            <th className="p-3 font-medium text-pd-accent" scope="col">
              {c.capitalCol}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-pd-border">
              <th
                className="p-3 text-left font-normal text-pd-text-muted"
                scope="row"
              >
                {row.label}
              </th>
              <td className="p-3 text-pd-text-muted">{row.wage}</td>
              <td className="p-3">{row.capital}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
