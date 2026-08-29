"use client";

import { useMemo, useState } from "react";
import { T } from "../../copy/ko";
import { TouchButton } from "../../primitives/Button";

export type KycStep = "guide" | "doc" | "confirm";
export type IdDocType = "kr_id" | "driver" | "passport";

export type KycSubmitPayload = {
  legalName: string;
  phone: string;
  birthDate: string;
  idDocType: IdDocType;
  /** Local file name only — R2 upload Owns=Money API */
  idDocFileName?: string;
  selfieFileName?: string;
  /** PART9i multipart — browser File when available */
  idDocFile?: File;
  selfieFile?: File;
};

export type KycFlowProps = {
  /** Prefill from Stage B profile */
  initialPhone?: string;
  initialBirthDate?: string;
  /** When true, show selfie optional field */
  selfieOptional?: boolean;
  onSubmit?: (payload: KycSubmitPayload) => void | Promise<void>;
  className?: string;
};

const DOC_OPTIONS: { id: IdDocType; label: string }[] = [
  { id: "kr_id", label: T.kyc.docTypeKrId },
  { id: "driver", label: T.kyc.docTypeDriver },
  { id: "passport", label: T.kyc.docTypePassport },
];

/**
 * Money §42 · UI §6.4d — PUTDUK 3-step KYC (guide → doc → confirm).
 * Forbidden: national-id type-in · gender · public object URLs · address Day-1.
 */
export function KycFlow({
  initialPhone = "",
  initialBirthDate = "",
  selfieOptional = false,
  onSubmit,
  className = "",
}: KycFlowProps) {
  const [step, setStep] = useState<KycStep>("guide");
  const [docType, setDocType] = useState<IdDocType>("kr_id");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docFileName, setDocFileName] = useState<string | undefined>();
  const [selfieFileName, setSelfieFileName] = useState<string | undefined>();
  const [idDocFile, setIdDocFile] = useState<File | undefined>();
  const [selfieFile, setSelfieFile] = useState<File | undefined>();
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canonId = useMemo(() => {
    if (step === "guide") return "kyc-guide";
    if (step === "doc") return "kyc-doc-capture";
    return "kyc-confirm";
  }, [step]);

  function onPickFile(file: File | undefined) {
    if (!file) return;
    setDocFileName(file.name);
    setIdDocFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDocFileName(undefined);
    setIdDocFile(undefined);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setSubmitError(null);
    try {
      await onSubmit?.({
        legalName: legalName.trim(),
        phone: phone.trim(),
        birthDate,
        idDocType: docType,
        idDocFileName: docFileName,
        selfieFileName,
        idDocFile,
        selfieFile,
      });
      setSubmitted(true);
    } catch {
      setSubmitError("본인 확인을 제출하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <main
        data-testid="kyc-flow"
        data-canon="kyc-confirm"
        data-kyc-state="pending"
        className={`flex flex-1 flex-col gap-4 text-pd-text ${className}`.trim()}
      >
        <h1 className="text-xl font-semibold">{T.kyc.pageTitle}</h1>
        <p className="text-sm" data-testid="kyc-pending-inline">
          {T.kyc.pendingInline}
        </p>
        <p className="text-sm text-pd-text-muted">{T.kyc.submittedHint}</p>
      </main>
    );
  }

  return (
    <main
      data-testid="kyc-flow"
      data-canon={canonId}
      data-kyc-step={step}
      className={`flex flex-1 flex-col gap-5 text-pd-text ${className}`.trim()}
    >
      {step === "guide" ? (
        <section data-canon-block="title" className="space-y-3">
          <h1 className="text-xl font-semibold" data-canon-block="title">
            {T.kyc.pageTitle}
          </h1>
          <p className="text-sm text-pd-text-muted">{T.kyc.pageSubtitle}</p>
          <p data-canon-block="why" className="text-sm">
            {T.kyc.whyOnce}
          </p>
          <p
            data-canon-block="privacy"
            className="text-sm text-pd-text-muted"
          >
            {T.kyc.storagePlain}
          </p>
          <p data-canon-block="steps" className="text-sm font-medium">
            {T.kyc.steps123}
          </p>
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="kyc-start"
            onClick={() => setStep("doc")}
          >
            {T.kyc.start}
          </TouchButton>
        </section>
      ) : null}

      {step === "doc" ? (
        <section className="space-y-4">
          <h1 className="text-xl font-semibold">{T.kyc.pageTitle}</h1>
          <fieldset data-canon-block="docType">
            <legend className="mb-2 text-sm text-pd-text-muted">
              {T.kyc.docType}
            </legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={T.kyc.docType}
            >
              {DOC_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={docType === opt.id}
                  data-testid={`kyc-doc-type-${opt.id}`}
                  data-active={docType === opt.id ? "true" : "false"}
                  className={
                    docType === opt.id
                      ? "touch-target rounded-pd-md border border-pd-accent bg-pd-elevated px-3 text-sm text-pd-accent"
                      : "touch-target rounded-pd-md border border-pd-border px-3 text-sm text-pd-text"
                  }
                  onClick={() => setDocType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div
            data-canon-block="frame"
            data-testid="kyc-capture-frame"
            className="flex min-h-48 flex-col items-center justify-center rounded-pd-md border border-dashed border-pd-border bg-pd-elevated p-4"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={T.kyc.preview}
                data-canon-block="preview"
                data-testid="kyc-preview"
                className="max-h-56 w-auto rounded-pd-sm object-contain"
              />
            ) : (
              <p className="text-center text-sm text-pd-text-muted">
                {T.kyc.captureHint}
              </p>
            )}
            <label className="mt-3 cursor-pointer text-sm text-pd-accent underline">
              {T.kyc.capturePick}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                data-testid="kyc-file-input"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
            </label>
          </div>

          {previewUrl ? (
            <TouchButton
              variant="secondary"
              className="w-full"
              data-canon-block="retake"
              data-testid="kyc-retake"
              onClick={retake}
            >
              {T.kyc.retake}
            </TouchButton>
          ) : null}

          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="kyc-next-confirm"
            disabled={!previewUrl}
            onClick={() => setStep("confirm")}
          >
            {T.kyc.nextConfirm}
          </TouchButton>
        </section>
      ) : null}

      {submitError ? (
        <p className="text-sm text-pd-danger" role="alert" data-testid="kyc-submit-error">
          {submitError}
        </p>
      ) : null}
      {step === "confirm" ? (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <h1 className="text-xl font-semibold">{T.kyc.pageTitle}</h1>

          <label
            className="flex flex-col gap-1 text-sm"
            data-canon-block="legalName"
            data-testid="kyc-field-legalName"
          >
            <span className="text-pd-text-muted">{T.kyc.legalName}</span>
            <input
              name="legalName"
              required
              minLength={2}
              maxLength={40}
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              autoComplete="name"
              className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
            />
          </label>

          <label
            className="flex flex-col gap-1 text-sm"
            data-canon-block="phone"
            data-testid="kyc-field-phone"
          >
            <span className="text-pd-text-muted">{T.kyc.phone}</span>
            <input
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
            />
          </label>

          <label
            className="flex flex-col gap-1 text-sm"
            data-canon-block="birthDate"
            data-testid="kyc-field-birthDate"
          >
            <span className="text-pd-text-muted">{T.kyc.birthDate}</span>
            <input
              name="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
            />
          </label>

          {selfieOptional ? (
            <label
              className="flex flex-col gap-1 text-sm"
              data-canon-block="selfie"
              data-testid="kyc-field-selfie"
            >
              <span className="text-pd-text-muted">
                {T.kyc.selfieOptional}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                data-testid="kyc-selfie-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setSelfieFileName(f?.name);
                  setSelfieFile(f);
                }}
                className="text-sm text-pd-text-muted"
              />
            </label>
          ) : null}

          <TouchButton
            type="submit"
            variant="primary"
            className="w-full"
            data-canon-block="submit"
            data-testid="kyc-submit"
            disabled={pending}
          >
            {T.kyc.submit}
          </TouchButton>

          <p
            data-canon-block="security"
            className="text-xs text-pd-text-muted"
          >
            {T.kyc.securityFooter}
          </p>
        </form>
      ) : null}
    </main>
  );
}
