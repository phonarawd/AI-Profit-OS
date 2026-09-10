/**
 * 고객 KYC 업로드 공식 계약.
 * 핸들러는 이미지를 디코드하지 않고 R2에 밀봉만 한다.
 * 매직 바이트로 식별 가능한 이미지 네 종류만 허용한다.
 */

import { BadRequestException } from "@nestjs/common";

export const KYC_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const KYC_MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export const KYC_REQUIRED_FILES = ["idDoc", "selfie"] as const;

export const KYC_UPLOAD_ERROR = {
  fileRequired: "KYC_FILE_REQUIRED",
  fileTooLarge: "KYC_FILE_TOO_LARGE",
  totalTooLarge: "KYC_TOTAL_TOO_LARGE",
  fileType: "KYC_FILE_TYPE",
  idSelfieRequired: "KYC_ID_SELFIE_REQUIRED",
} as const;

export type KycUploadKind = "idDoc" | "selfie";
export type KycAllowedImage = "jpeg" | "png" | "webp" | "heic";

export const KYC_ALLOWED_IMAGES: readonly KycAllowedImage[] = [
  "jpeg",
  "png",
  "webp",
  "heic",
] as const;

const MIME_BY_IMAGE: Record<KycAllowedImage, readonly string[]> = {
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
};

const EXT_BY_IMAGE: Record<KycAllowedImage, readonly string[]> = {
  jpeg: [".jpg", ".jpeg"],
  png: [".png"],
  webp: [".webp"],
  heic: [".heic", ".heif"],
};

export function detectKycImage(bytes: Buffer): KycAllowedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (bytes.length >= 12) {
    const brand = bytes.subarray(8, 12).toString("ascii");
    if (bytes.subarray(4, 8).toString("ascii") === "ftyp") {
      if (
        brand === "heic" ||
        brand === "heix" ||
        brand === "mif1" ||
        brand === "msf1" ||
        brand === "hevc"
      ) {
        return "heic";
      }
    }
  }
  return null;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function assertKycUploadFile(input: {
  kind: KycUploadKind;
  bytes: Buffer;
  mime?: string;
  originalName?: string;
}): KycAllowedImage {
  if (!input.bytes?.length) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.fileRequired);
  }
  if (input.bytes.length > KYC_MAX_FILE_BYTES) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.fileTooLarge);
  }
  const detected = detectKycImage(input.bytes);
  if (!detected) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.fileType);
  }
  const mime = (input.mime ?? "").trim().toLowerCase();
  if (mime && !(MIME_BY_IMAGE[detected] as readonly string[]).includes(mime)) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.fileType);
  }
  const name = input.originalName ?? "";
  const ext = extOf(name);
  if (ext && !(EXT_BY_IMAGE[detected] as readonly string[]).includes(ext)) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.fileType);
  }
  return detected;
}

export function assertKycUploadPair(input: {
  idDoc: { bytes: Buffer; mime?: string; originalName?: string };
  selfie?: { bytes: Buffer; mime?: string; originalName?: string };
}): void {
  if (!input.selfie?.bytes?.length) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.idSelfieRequired);
  }
  assertKycUploadFile({ kind: "idDoc", ...input.idDoc });
  assertKycUploadFile({ kind: "selfie", ...input.selfie });
  const total = input.idDoc.bytes.length + input.selfie.bytes.length;
  if (total > KYC_MAX_TOTAL_BYTES) {
    throw new BadRequestException(KYC_UPLOAD_ERROR.totalTooLarge);
  }
}
