"use client";

import { SettingsClient } from "./SettingsClient";

/** /me/settings — prefs + logout + delete. Security 별도 라우트 없음 */
export default function Page() {
  return <SettingsClient />;
}
