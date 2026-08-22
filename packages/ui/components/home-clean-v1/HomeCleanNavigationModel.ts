import { homeCleanNavIconIdFromHref } from "./home-clean-nav-icons";
import type { HomeCleanNavItem, HomeCleanTabSource } from "./home-clean.types";

export function isHomeCleanNavActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname === "/dev/home-clean-v1";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function buildHomeCleanNavigationModel(
  tabs: readonly HomeCleanTabSource[],
  pathname: string,
): HomeCleanNavItem[] {
  const items: HomeCleanNavItem[] = [];
  for (const tab of tabs) {
    const iconId = homeCleanNavIconIdFromHref(tab.href);
    if (!iconId) continue;
    items.push({
      label: tab.label,
      href: tab.href,
      active: isHomeCleanNavActive(tab.href, pathname),
      iconId,
    });
  }
  return items;
}
