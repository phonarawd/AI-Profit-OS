import { redirect } from "next/navigation";

/** 레거시 경로 · 운영 UI = /admin/growth?tab=whale (이중 IA 금지) */
export default function Page() {
  redirect("/admin/growth?tab=whale");
}
