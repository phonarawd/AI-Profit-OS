"use client";

import { KycFlow, type KycSubmitPayload } from "@aipo/ui/components/kyc";

/**
 * Money §42 · UI §6.4d · PART9i — multipart POST /api/v1/compliance/kyc/submit
 */
export default function Page() {
  return (
    <div className="p-6">
      <KycFlow
        onSubmit={async (payload: KycSubmitPayload) => {
          const fd = new FormData();
          fd.set("legalName", payload.legalName);
          fd.set("phoneE164", payload.phone);
          fd.set("birthDate", payload.birthDate);
          fd.set("idDocType", payload.idDocType);
          if (payload.idDocFile) {
            fd.set("idDoc", payload.idDocFile, payload.idDocFile.name);
          }
          if (payload.selfieFile) {
            fd.set("selfie", payload.selfieFile, payload.selfieFile.name);
          }
          const res = await fetch("/api/v1/compliance/kyc/submit", {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          if (!res.ok) {
            throw new Error(`kyc_submit_${res.status}`);
          }
        }}
      />
    </div>
  );
}
