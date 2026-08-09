"use client";

import { KycFlow } from "@aipo/ui/components/kyc";

/**
 * Money §42 · UI §6.4d — /me/kyc Lux 3-step.
 * Canon: kyc-guide → kyc-doc-capture → kyc-confirm · national-id type-in 0
 */
export default function Page() {
  return (
    <div className="p-6">
      <KycFlow
        onSubmit={async () => {
          // Money Owns: POST /api/v1/compliance/kyc/submit (multipart)
          // Phase0 UI marks pending after local submit; Nest wire later.
        }}
      />
    </div>
  );
}
