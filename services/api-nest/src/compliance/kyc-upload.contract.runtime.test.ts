import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KYC_MAX_FILE_BYTES,
  KYC_MAX_TOTAL_BYTES,
  KYC_UPLOAD_ERROR,
  assertKycUploadPair,
  detectKycImage,
} from "./kyc-upload.contract.ts";

function jpegStub(size = 32): Buffer {
  const buf = Buffer.alloc(size, 1);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

function pngStub(size = 32): Buffer {
  const buf = Buffer.alloc(size, 2);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  return buf;
}

describe("kyc upload contract", () => {
  it("detects jpeg/png/webp/heic magic", () => {
    assert.equal(detectKycImage(jpegStub()), "jpeg");
    assert.equal(detectKycImage(pngStub()), "png");
    const webp = Buffer.from("RIFF....WEBP");
    webp.write("RIFF", 0);
    webp.write("WEBP", 8);
    assert.equal(detectKycImage(webp), "webp");
    const heic = Buffer.alloc(16, 0);
    heic.write("ftyp", 4);
    heic.write("heic", 8);
    assert.equal(detectKycImage(heic), "heic");
    assert.equal(detectKycImage(Buffer.from("not-an-image")), null);
  });

  it("requires both files and rejects type/size before any status change", () => {
    assert.throws(
      () => assertKycUploadPair({ idDoc: { bytes: jpegStub() } }),
      /KYC_ID_SELFIE_REQUIRED/,
    );
    assert.throws(
      () =>
        assertKycUploadPair({
          idDoc: { bytes: Buffer.from("x") },
          selfie: { bytes: jpegStub() },
        }),
      /KYC_FILE_TYPE/,
    );
    assert.throws(
      () =>
        assertKycUploadPair({
          idDoc: { bytes: jpegStub(KYC_MAX_FILE_BYTES + 1) },
          selfie: { bytes: jpegStub() },
        }),
      /KYC_FILE_TOO_LARGE/,
    );
    assert.throws(
      () =>
        assertKycUploadPair({
          idDoc: { bytes: jpegStub(4 * 1024 * 1024) },
          selfie: { bytes: jpegStub(KYC_MAX_TOTAL_BYTES - 4 * 1024 * 1024 + 1) },
        }),
      /KYC_TOTAL_TOO_LARGE/,
    );
    assertKycUploadPair({
      idDoc: { bytes: jpegStub(), mime: "image/jpeg", originalName: "id.jpg" },
      selfie: { bytes: pngStub(), mime: "image/png", originalName: "face.png" },
    });
    assert.equal(KYC_UPLOAD_ERROR.fileType, "KYC_FILE_TYPE");
  });

  it("rejects mime/extension that disagree with magic", () => {
    assert.throws(
      () =>
        assertKycUploadPair({
          idDoc: { bytes: jpegStub(), mime: "image/png", originalName: "id.jpg" },
          selfie: { bytes: pngStub(), mime: "image/png", originalName: "face.png" },
        }),
      /KYC_FILE_TYPE/,
    );
  });
});
