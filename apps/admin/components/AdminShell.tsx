"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { ADMIN_MODULES } from "../routes";
import { AdminSessionBar } from "./AdminSessionBar";

const topLevel = ADMIN_MODULES.filter(
  (item) => !("sidebarChild" in item && item.sidebarChild),
);
const executionPolicy = ADMIN_MODULES.find((item) => item.id === "2b");

const GROUPS = [
  { label: T.admin.navigationGroups.today, ids: [1] },
  { label: T.admin.navigationGroups.profit, ids: [2, 3] },
  { label: T.admin.navigationGroups.moneyAndPeople, ids: [4, 5, 6] },
  { label: T.admin.navigationGroups.safety, ids: [7, 8, 9] },
  { label: T.admin.navigationGroups.records, ids: [10, 11, 12] },
] as const;

function isActive(pathname: string, href: string, id: number | string) {
  if (id === 1) return pathname === "/admin";
  if (id === 2) return pathname.startsWith("/admin/opportunities");
  return pathname === href || pathname.startsWith(`${href}/`);
}

let persistedMenuOpen = false;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpenState] = useState(persistedMenuOpen);
  const previousPathname = useRef(pathname);

  const setMenuOpen = (next: boolean | ((open: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(persistedMenuOpen) : next;
    persistedMenuOpen = value;
    setMenuOpenState(value);
  };

  // 마운트·동일 경로 effect 재실행은 닫지 않는다. 첫 클릭과 레이스가 난다.
  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;
    persistedMenuOpen = false;
    setMenuOpenState(false);
  }, [pathname]);

  const currentLabel = useMemo(() => {
    if (pathname === executionPolicy?.href) return executionPolicy.label;
    return (
      topLevel.find((item) => isActive(pathname, item.href, item.id))?.label ??
      T.admin.productName
    );
  }, [pathname]);

  return (
    <div className="admin-app-shell" data-testid="admin-app-shell">
      <a className="admin-skip-link" href="#admin-content">
        {T.admin.skipToContent}
      </a>

      <button
        type="button"
        className="admin-nav-backdrop"
        aria-label={T.admin.closeMenu}
        data-open={menuOpen ? "true" : "false"}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className="admin-sidebar"
        data-open={menuOpen ? "true" : "false"}
        aria-label={T.admin.navigationLabel}
      >
        <div className="admin-brand-block">
          <Link href="/admin" className="admin-brand-link">
            <span className="admin-brand-name">{T.admin.productName}</span>
            <span className="admin-brand-description">
              {T.admin.productDescription}
            </span>
          </Link>
          <span className="admin-only-label">{T.admin.adminOnly}</span>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setMenuOpen(false)}
          >
            {T.admin.closeMenu}
          </button>
        </div>

        <nav
          id="admin-primary-navigation"
          className="admin-navigation"
          aria-label={T.admin.navigationLabel}
        >
          {GROUPS.map((group) => (
            <section className="admin-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              <div className="admin-nav-items">
                {topLevel
                  .filter((item) =>
                    (group.ids as readonly (number | string)[]).includes(item.id),
                  )
                  .map((item) => {
                    const active = isActive(pathname, item.href, item.id);
                    return (
                      <div key={String(item.id)}>
                        <Link
                          href={item.href}
                          className="admin-nav-link"
                          aria-current={active ? "page" : undefined}
                          data-active={active ? "true" : "false"}
                        >
                          <span className="admin-nav-dot" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                        {item.id === 2 && executionPolicy ? (
                          <Link
                            href={executionPolicy.href}
                            className="admin-nav-link admin-nav-link-child"
                            aria-current={
                              pathname === executionPolicy.href ? "page" : undefined
                            }
                            data-active={
                              pathname === executionPolicy.href ? "true" : "false"
                            }
                          >
                            {executionPolicy.label}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="admin-main-column">
        <header className="admin-mobile-header">
          <button
            type="button"
            className="admin-menu-button"
            aria-expanded={menuOpen}
            aria-controls="admin-primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? "닫기" : "메뉴"}</span>
            <span className="sr-only">
              {menuOpen ? T.admin.closeMenu : T.admin.openMenu}
            </span>
          </button>
          <div>
            <p className="admin-mobile-product">{T.admin.productName}</p>
            <p className="admin-mobile-current">{currentLabel}</p>
          </div>
        </header>

        <AdminSessionBar />
        <div id="admin-content" className="admin-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
