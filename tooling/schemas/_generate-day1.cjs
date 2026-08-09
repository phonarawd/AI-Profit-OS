#!/usr/bin/env node
/**
 * One-shot Day-1 schema author for todo schemas-contracts-core.
 * SSOT: docs/CONSTITUTION_BOOTSTRAP.md §3.1 + domain plan field locks.
 * Run: node tooling/schemas/_generate-day1.cjs
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "schemas");

const DRAFT = "https://json-schema.org/draft/2020-12/schema";
const ID = (name) => `https://ai-profit-os.local/schemas/${name}`;

const decimal = {
  type: "string",
  pattern: "^-?[0-9]+(\\.[0-9]+)?$",
  description: "Decimal as string (no float money)",
};

const iso8601 = {
  type: "string",
  format: "date-time",
  description: "ISO-8601 timestamp",
};

const uuidLike = { type: "string", minLength: 1 };

const capitalBand = {
  type: "string",
  enum: ["micro", "small", "mid", "high", "whale"],
};

const matchStrictness = {
  type: "string",
  enum: ["lenient", "standard", "tight", "scarce", "custom"],
};

const category = {
  type: "string",
  enum: ["watch", "trading_card", "luxury_bag"],
};

const imageSource = {
  type: "string",
  enum: ["ebay", "pokemontcg", "ygoprodeck", "admin_r2"],
};

const marketId = {
  type: "string",
  enum: ["ebay_us", "ebay_gb", "ebay_de", "ebay_au", "admin"],
  description: "Day-1 pricing enum · yahoo_jp/amazon Phase1+ partner registry (§0.0.1c)",
};

const listingMarketId = {
  type: "string",
  enum: [
    "ebay_us",
    "ebay_gb",
    "ebay_de",
    "ebay_au",
    "admin",
    "amazon_us",
    "amazon_jp",
    "amazon_de",
    "yahoo_jp",
  ],
  description:
    "Day-1 auto-publish ebay_*|admin · amazon_*/yahoo_jp Phase1+ partner (§0.0.1c)",
};

const kycStatus = {
  type: "string",
  enum: ["none", "pending", "approved", "rejected"],
};

function meta(name, title, description, body) {
  return {
    $schema: DRAFT,
    $id: ID(name),
    title,
    description,
    ...body,
  };
}

function write(name, doc) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
  return name;
}

const written = [];

// --- shared never notes in descriptions ---

written.push(
  write(
    "operator-entity.v1.json",
    meta(
      "operator-entity.v1.json",
      "OperatorEntityV1",
      "§50.9 legal/KYB SSOT · PRE-OWNED WATCHES L.L.C · DET 1135431 · footer/JSON-LD single import.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "legalName",
          "legalForm",
          "licenseNumber",
          "issuingAuthority",
          "jurisdiction",
          "licenseStatus",
          "primaryActivityEn",
          "primaryActivityKo",
          "licensedActivities",
          "addresses",
          "verificationUrls",
        ],
        properties: {
          legalName: { const: "PRE-OWNED WATCHES L.L.C" },
          legalForm: { const: "LLC" },
          licenseNumber: { const: "1135431" },
          issuingAuthority: {
            const: "Dubai Department of Economy and Tourism",
          },
          jurisdiction: { const: "AE-DU" },
          licenseStatus: {
            type: "string",
            enum: ["active", "pending_verification"],
          },
          primaryActivityEn: {
            const: "Watches & Clocks & Spare Parts Retailing",
          },
          primaryActivityKo: { const: "시계 및 예비 부품 소매업" },
          licensedActivities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["activityKo", "activityEn", "platformScope"],
              properties: {
                activityKo: { type: "string", minLength: 1 },
                activityEn: { type: "string", minLength: 1 },
                likelyDetCode: {
                  type: "string",
                  description: "KYB estimate only · render 0 until verifiedAt",
                },
                platformScope: {
                  type: "string",
                  enum: [
                    "watch",
                    "trading_card",
                    "luxury_bag",
                    "platform",
                    "ecommerce",
                    "ai_service",
                  ],
                },
              },
            },
          },
          tradingBrand: { type: "string" },
          relatedWebsite: { type: "string", format: "uri" },
          addresses: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "lines", "city", "country"],
              properties: {
                label: { type: "string" },
                lines: { type: "array", items: { type: "string" }, minItems: 1 },
                city: { type: "string" },
                country: { const: "AE" },
              },
            },
          },
          verificationUrls: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "url"],
              properties: {
                label: { type: "string" },
                url: { type: "string", format: "uri" },
              },
            },
          },
          verifiedAt: iso8601,
        },
        examples: [
          {
            legalName: "PRE-OWNED WATCHES L.L.C",
            legalForm: "LLC",
            licenseNumber: "1135431",
            issuingAuthority: "Dubai Department of Economy and Tourism",
            jurisdiction: "AE-DU",
            licenseStatus: "pending_verification",
            primaryActivityEn: "Watches & Clocks & Spare Parts Retailing",
            primaryActivityKo: "시계 및 예비 부품 소매업",
            licensedActivities: [
              {
                activityKo: "시계 및 예비 부품 소매업",
                activityEn: "Watches & Clocks & Spare Parts Retailing",
                platformScope: "watch",
              },
              {
                activityKo: "트레이딩 카드·수집품 거래",
                activityEn: "Trading cards and collectibles trading",
                platformScope: "trading_card",
              },
              {
                activityKo: "명품 가방·액세서리 중개",
                activityEn: "Luxury bag and accessories brokerage",
                platformScope: "luxury_bag",
              },
              {
                activityKo: "온라인 전자상거래·앱 운영",
                activityEn: "Online ecommerce and app operation",
                platformScope: "ecommerce",
              },
              {
                activityKo: "AI 시세 기회 안내·거래 지원",
                activityEn: "AI market opportunity guidance and trade support",
                platformScope: "ai_service",
              },
              {
                activityKo: "해외 시세 비교·국제 중개",
                activityEn: "Cross-border price compare and brokerage",
                platformScope: "platform",
              },
            ],
            tradingBrand: "Pre-Owned Watches",
            relatedWebsite: "https://preownedwatches.ae",
            addresses: [
              {
                label: "showroom",
                lines: [
                  "Kia Flagship Office G05",
                  "Sheikh Zayed Road, Al Quoz 1",
                ],
                city: "Dubai",
                country: "AE",
              },
              {
                label: "office",
                lines: ["Office 322", "Blue Bay Tower", "Al Abraj Street, Business Bay"],
                city: "Dubai",
                country: "AE",
              },
            ],
            verificationUrls: [
              {
                label: "Invest in Dubai directory",
                url: "https://www.investindubai.gov.ae/en/dubai-business-directory-search",
              },
            ],
          },
        ],
      }
    )
  )
);

written.push(
  write(
    "user-ux-prefs.v1.json",
    meta(
      "user-ux-prefs.v1.json",
      "UserUxPrefsV1",
      "UI §38.9·§50.1 · toneBand·fontScale·depositPref. NEVER: theme light/system · gender · EN locale switch.",
      {
        type: "object",
        additionalProperties: false,
        required: ["toneBand", "fontScale", "depositPref"],
        properties: {
          userId: uuidLike,
          toneBand: { type: "string", enum: ["young", "mid", "senior"] },
          fontScale: { type: "string", enum: ["md", "lg", "xl"] },
          depositPref: {
            type: "string",
            enum: ["usdt", "krw"],
            description: "Display default deposit tab only · engine USDT recommend unchanged",
          },
          updatedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "user-membership.v1.json",
    meta(
      "user-membership.v1.json",
      "UserMembershipV1",
      "Engine §0.0.7 membership ladder. NEVER: membership alone ⇒ MATCH_SUCCESS 100% · conflate referral tiers · Soft/Hard by grade.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "membership",
          "maxCapitalBand",
          "dailyUserMatchCap",
          "matchStrictness",
          "dailyMatchesUsed",
        ],
        properties: {
          userId: uuidLike,
          membership: {
            type: "string",
            enum: ["sprout", "entry", "core", "high", "vip"],
          },
          maxCapitalBand: capitalBand,
          dailyUserMatchCap: { type: "integer", minimum: 0 },
          matchStrictness: matchStrictness,
          adminForce: { type: "boolean" },
          aiPerkFlags: { type: "array", items: { type: "string" } },
          fulfillRate7d: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Display only · NEVER Rule input",
          },
          dailyMatchesUsed: { type: "integer", minimum: 0 },
          updatedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "user-capability.v1.json",
    meta(
      "user-capability.v1.json",
      "UserCapabilityV1",
      "Admin §9.8.4a · matchBlocked · withdrawApplyBlocked. NEVER: silent block · ledger-as-block.",
      {
        type: "object",
        additionalProperties: false,
        required: ["userId", "matchBlocked", "withdrawApplyBlocked"],
        properties: {
          userId: uuidLike,
          matchBlocked: { type: "boolean" },
          withdrawApplyBlocked: { type: "boolean" },
          reason: {
            type: "string",
            minLength: 10,
            description: "Required ≥10 when enabling a block",
          },
          updatedByAdminId: uuidLike,
          updatedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "notification-prefs.v1.json",
    meta(
      "notification-prefs.v1.json",
      "NotificationPrefsV1",
      "UI §50.1n · signup defaults ALL true · OFF skips Push only · inbox still stored.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "master",
          "opportunity",
          "wallet",
          "notice",
          "campaign",
          "opsMessage",
          "strategyMatch",
        ],
        properties: {
          userId: uuidLike,
          master: { type: "boolean" },
          opportunity: { type: "boolean" },
          wallet: { type: "boolean" },
          notice: { type: "boolean" },
          campaign: { type: "boolean" },
          opsMessage: { type: "boolean" },
          strategyMatch: { type: "boolean" },
          updatedAt: iso8601,
        },
        default: {
          master: true,
          opportunity: true,
          wallet: true,
          notice: true,
          campaign: true,
          opsMessage: true,
          strategyMatch: true,
        },
      }
    )
  )
);

written.push(
  write(
    "ops-inbox-message.v1.json",
    meta(
      "ops-inbox-message.v1.json",
      "OpsInboxMessageV1",
      "Admin §9.8.8d · UI §5.9.4 · 1-user ops message. NEVER: hard delete · guaranteed profit · tendency-memo to user.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "userId",
          "template",
          "titleKo",
          "bodyKo",
          "createdByAdminId",
          "createdAt",
        ],
        properties: {
          id: uuidLike,
          userId: uuidLike,
          template: {
            type: "string",
            enum: [
              "OPS_NOTICE",
              "OPS_KYC",
              "OPS_DEPOSIT",
              "OPS_WITHDRAW",
              "OPS_CUSTOM",
            ],
          },
          titleKo: { type: "string", maxLength: 40 },
          bodyKo: { type: "string", maxLength: 500 },
          href: { type: "string" },
          readAt: iso8601,
          hiddenAt: iso8601,
          sourceEventId: { type: "string" },
          createdByAdminId: uuidLike,
          createdAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "wallet-buckets.v1.json",
    meta(
      "wallet-buckets.v1.json",
      "WalletBucketsV1",
      "Money §49 · principal/profit/locked/practice · sum==liabilityUsdt. NEVER: balance+= · practice withdraw/participate.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "principalUsdt",
          "profitUsdt",
          "lockedUsdt",
          "practiceUsdt",
          "liabilityUsdt",
          "asOfLedgerEntryId",
        ],
        properties: {
          userId: uuidLike,
          principalUsdt: decimal,
          profitUsdt: decimal,
          lockedUsdt: decimal,
          practiceUsdt: decimal,
          liabilityUsdt: decimal,
          asOfLedgerEntryId: uuidLike,
        },
      }
    )
  )
);

written.push(
  write(
    "withdraw-intent.v1.json",
    meta(
      "withdraw-intent.v1.json",
      "WithdrawIntentV1",
      "Money §49.3 · default mode=profit. NEVER: create when withdrawApplyBlocked · spend practice/locked · hide principal path.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "mode",
          "amountUsdt",
          "asset",
          "debitProfitUsdt",
          "debitPrincipalUsdt",
          "requirePrincipalConfirm",
          "idempotencyKey",
        ],
        properties: {
          userId: uuidLike,
          mode: { type: "string", enum: ["profit", "principal", "combined"] },
          amountUsdt: decimal,
          asset: { type: "string", enum: ["USDT", "KRW"] },
          debitProfitUsdt: decimal,
          debitPrincipalUsdt: decimal,
          requirePrincipalConfirm: { type: "boolean" },
          principalConfirmToken: {
            type: "string",
            description: "Required when mode is principal|combined",
          },
          idempotencyKey: { type: "string", minLength: 8 },
          withdrawFeeUsdt: {
            type: "string",
            pattern: "^[0-9]+(\\.[0-9]+)?$",
            description:
              "Money §11.1 · quoted from deposit-config.usdtOnchain.usdtWithdrawNetworkFeeUsdt · confirm UX must show WITHDRAW_FEE_HINT",
          },
          createdAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "webauthn-challenge.v1.json",
    meta(
      "webauthn-challenge.v1.json",
      "WebauthnChallengeV1",
      "Money §43.6 step-up challenge · TTL 60s · origin=APP_HOST. NEVER: PWA redefine OTP/PIN/recovery policy · SMS Day-1 required.",
      {
        type: "object",
        additionalProperties: false,
        required: ["challengeId", "userId", "method", "expiresAt", "origin"],
        properties: {
          challengeId: uuidLike,
          userId: uuidLike,
          method: {
            type: "string",
            enum: ["webauthn", "email_otp", "pin", "recovery"],
            description:
              "§43.6 priority order: webauthn → email_otp → pin → recovery",
          },
          expiresAt: iso8601,
          origin: {
            type: "string",
            minLength: 1,
            description: "Must match APP_HOST allowlist",
          },
          rpId: {
            type: "string",
            description:
              "WebAuthn RP ID = APP_HOST host only · UX package Owns=PWA §23.6",
          },
          publicKeyOptions: {
            type: "object",
            additionalProperties: true,
            description: "Pass-through for @simplewebauthn/browser (PWA UX)",
          },
        },
      }
    )
  )
);

written.push(
  write(
    "deposit-config.v1.json",
    meta(
      "deposit-config.v1.json",
      "DepositConfigV1",
      "Admin §37 · KRW rep account + TronGrid/onchain. NEVER: shared user deposit address · poll watcher · PG사 fields.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "configVersion",
          "krw",
          "usdtOnchain",
          "withdrawGuards",
          "pricingGuards",
          "updatedAt",
          "updatedByAdminId",
        ],
        properties: {
          configVersion: { type: "integer", minimum: 1 },
          krw: {
            type: "object",
            additionalProperties: false,
            required: [
              "bankName",
              "accountNumber",
              "accountHolder",
              "noticeKo",
              "krwWithdrawFeeKrw",
            ],
            properties: {
              bankName: { type: "string" },
              accountNumber: { type: "string" },
              accountHolder: { type: "string" },
              noticeKo: { type: "string" },
              krwWithdrawFeeKrw: {
                type: "integer",
                minimum: 0,
                default: 0,
                description:
                  "Money §11.1 · Day-1 default 0 · Admin deposit-settings",
              },
            },
          },
          usdtOnchain: {
            type: "object",
            additionalProperties: false,
            required: [
              "network",
              "tronGridBaseUrl",
              "chainWatcherMode",
              "usdtUiConfirmations",
              "usdtLedgerConfirmations",
              "usdtContract",
              "hotWalletXpubRef",
              "treasuryHotAddressRef",
              "energyDelegateEnabled",
              "usdtWithdrawNetworkFeeUsdt",
              "minTrxStakeForSweeper",
            ],
            properties: {
              network: { const: "TRC20" },
              tronGridBaseUrl: {
                type: "string",
                format: "uri",
                default: "https://api.trongrid.io",
              },
              tronGridApiKey: { type: "string" },
              chainWatcherMode: { const: "event_stream" },
              usdtUiConfirmations: { type: "integer", const: 1 },
              usdtLedgerConfirmations: { type: "integer", const: 19 },
              usdtContract: {
                const: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
              },
              hotWalletXpubRef: { type: "string", minLength: 1 },
              treasuryHotAddressRef: { type: "string", minLength: 1 },
              energyDelegateEnabled: { type: "boolean" },
              usdtWithdrawNetworkFeeUsdt: {
                type: "string",
                pattern: "^[0-9]+(\\.[0-9]+)?$",
                description:
                  "Money §11.1 · Day-1 default 1 · Admin deposit-settings",
              },
              minTrxStakeForSweeper: {
                type: "string",
                pattern: "^[0-9]+(\\.[0-9]+)?$",
                description: "Money §43.2.1 · Day-1 default 5000 TRX",
              },
              sweeperPaused: {
                type: "boolean",
                default: false,
                description:
                  "Admin pause · user credit 불변 · 집금만 중지",
              },
            },
          },
          withdrawGuards: {
            type: "object",
            additionalProperties: false,
            required: ["minHoldingHours"],
            properties: {
              minHoldingHours: {
                type: "integer",
                minimum: 0,
                default: 24,
                description:
                  "Money §11.2 · principal|combined only · profit-only 미적용 · 구호칭 compliance.minHoldingHours 승계",
              },
            },
          },
          pricingGuards: {
            type: "object",
            additionalProperties: false,
            required: ["priceStaleMaxSec", "requireMinProfitUsdt"],
            properties: {
              priceStaleMaxSec: { type: "integer", minimum: 1, default: 3 },
              requireMinProfitUsdt: { type: "boolean", const: true },
            },
          },
          updatedAt: iso8601,
          updatedByAdminId: uuidLike,
        },
      }
    )
  )
);

written.push(
  write(
    "user-deposit-address.v1.json",
    meta(
      "user-deposit-address.v1.json",
      "UserDepositAddressV1",
      "§41 per-user TRC20. NEVER: admin manual address edit · shared address.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "trc20Address",
          "derivationIndex",
          "qrPayload",
          "createdAt",
        ],
        properties: {
          userId: uuidLike,
          trc20Address: { type: "string", minLength: 30 },
          derivationIndex: { type: "integer", minimum: 0 },
          qrPayload: { type: "string", minLength: 1 },
          createdAt: iso8601,
          lastSeenTxAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "krw-deposit-request.v1.json",
    meta(
      "krw-deposit-request.v1.json",
      "KrwDepositRequestV1",
      "§41+§43 PG-free unique payableAmount + TTL. NEVER: PG사 SDK.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "userId",
          "requestedAmountKrw",
          "payableAmountKrw",
          "uniqueSuffixKrw",
          "depositCode",
          "depositorName",
          "status",
          "expiresAt",
          "idempotencyKey",
          "createdAt",
        ],
        properties: {
          id: uuidLike,
          userId: uuidLike,
          requestedAmountKrw: { type: "integer", minimum: 1 },
          payableAmountKrw: {
            type: "integer",
            minimum: 1,
            description: "UNIQUE among active requests",
          },
          uniqueSuffixKrw: { type: "integer", minimum: 0 },
          depositCode: { type: "string", minLength: 4 },
          depositorName: { type: "string", minLength: 1 },
          status: {
            type: "string",
            enum: [
              "pending",
              "matched",
              "approved",
              "expired",
              "rejected",
              "manual_review",
            ],
          },
          expiresAt: iso8601,
          adminNote: { type: "string" },
          ledgerEntryId: uuidLike,
          idempotencyKey: { type: "string", minLength: 8 },
          createdAt: iso8601,
          decidedAt: iso8601,
          decidedByAdminId: uuidLike,
        },
      }
    )
  )
);

written.push(
  write(
    "kyc-status.v1.json",
    meta(
      "kyc-status.v1.json",
      "KycStatusV1",
      "§42 withdraw-only KYC gate status. Participate/deposit do not require KYC.",
      {
        type: "object",
        additionalProperties: false,
        required: ["userId", "kycStatus"],
        properties: {
          userId: uuidLike,
          kycStatus: kycStatus,
          decidedAt: iso8601,
          rejectReason: { type: "string", minLength: 10 },
          submissionId: uuidLike,
        },
      }
    )
  )
);

written.push(
  write(
    "kyc-submission.v1.json",
    meta(
      "kyc-submission.v1.json",
      "KycSubmissionV1",
      "Money §42.2.2 field lock · R2 keys only. NEVER: rrnFull · gender · publicUrl.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "submissionId",
          "userId",
          "legalName",
          "phoneE164",
          "birthDate",
          "idDocType",
          "idDocR2Key",
          "status",
          "createdAt",
        ],
        properties: {
          submissionId: uuidLike,
          userId: uuidLike,
          legalName: { type: "string", minLength: 1 },
          phoneE164: {
            type: "string",
            pattern: "^\\+[1-9][0-9]{7,14}$",
          },
          birthDate: {
            type: "string",
            format: "date",
            description: "YYYY-MM-DD · age 19+",
          },
          idDocType: {
            type: "string",
            enum: ["kr_id", "driver", "passport"],
          },
          idDocR2Key: {
            type: "string",
            pattern: "^kyc/",
            description: "R2 object key · never public URL",
          },
          selfieR2Key: { type: "string", pattern: "^kyc/" },
          status: kycStatus,
          rejectReason: { type: "string", minLength: 10 },
          createdAt: iso8601,
          decidedAt: iso8601,
        },
        not: {
          anyOf: [
            { required: ["rrnFull"] },
            { required: ["gender"] },
            { required: ["publicUrl"] },
          ],
        },
      }
    )
  )
);

written.push(
  write(
    "asset-master.v1.json",
    meta(
      "asset-master.v1.json",
      "AssetMasterV1",
      "Engine §0.0.6 · imageUrl SKU 1:1. Cross-category image = FAIL.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "assetId",
          "category",
          "assetLabel",
          "imageUrl",
          "imageSource",
          "imageAltKo",
          "imageRightsNoteKo",
        ],
        properties: {
          assetId: uuidLike,
          category: category,
          assetLabel: { type: "string", minLength: 1 },
          imageUrl: { type: "string", format: "uri" },
          imageSource: imageSource,
          imageAltKo: { type: "string", minLength: 1 },
          imageRightsNoteKo: { const: "시세 참고용" },
          imageFetchedAt: iso8601,
          meta: { type: "object" },
        },
      }
    )
  )
);

written.push(
  write(
    "listing.v1.json",
    meta(
      "listing.v1.json",
      "ListingV1",
      "Engine §0.0.1a listing leg · Day-1 auto-publish=ebay marketplaceId×N|admin · Phase1+ partner legs=amazon_*|yahoo_jp (§0.0.1c).",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "assetId",
          "marketId",
          "adapterId",
          "priceUsdt",
          "observedAt",
          "staleAt",
        ],
        properties: {
          id: uuidLike,
          assetId: uuidLike,
          marketId: listingMarketId,
          adapterId: {
            type: "string",
            enum: ["ebay", "admin", "amazon", "yahoo_jp"],
            description:
              "Day-1 auto-publish ebay|admin · amazon/yahoo_jp Phase1+ official partners",
          },
          marketplaceId: {
            type: "string",
            enum: ["EBAY_US", "EBAY_GB", "EBAY_DE", "EBAY_AU"],
          },
          externalItemId: { type: "string" },
          title: { type: "string" },
          priceUsdt: decimal,
          currency: { type: "string" },
          url: { type: "string" },
          imageUrl: { type: "string" },
          observedAt: iso8601,
          staleAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "price-observation.v1.json",
    meta(
      "price-observation.v1.json",
      "PriceObservationV1",
      "Engine §0.0.1a PriceObservation.source · catalog refs allowed · Day-1 listing auto-publish requires ebay|admin legs · amazon/yahoo_jp Phase1+ partner (§0.0.1c).",
      {
        type: "object",
        additionalProperties: false,
        required: ["id", "assetId", "source", "observedAt"],
        properties: {
          id: uuidLike,
          assetId: uuidLike,
          source: {
            type: "string",
            enum: [
              "ebay",
              "admin",
              "pokemontcg",
              "ygoprodeck",
              "coingecko",
              "frankfurter",
              "amazon",
              "yahoo_jp",
            ],
            description:
              "Day-1 auto-publish listing legs=ebay|admin · amazon/yahoo_jp=Phase1+ partner ingest",
          },
          marketplaceId: {
            type: "string",
            enum: ["EBAY_US", "EBAY_GB", "EBAY_DE", "EBAY_AU"],
          },
          priceUsdt: decimal,
          currency: { type: "string" },
          observedAt: iso8601,
          meta: { type: "object" },
        },
      }
    )
  )
);

written.push(
  write(
    "fx-snapshot.v1.json",
    meta(
      "fx-snapshot.v1.json",
      "FxSnapshotV1",
      "Engine §0.0.4.2 FX snapshot · formulaId cg_usdt_krw | cg_usdt_usd__frank_usd_krw. NEVER: yahoo_jp · mixed-time rates.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "fxSnapshotId",
          "formulaId",
          "sources",
          "usdtKrw",
          "capturedAt",
        ],
        properties: {
          fxSnapshotId: uuidLike,
          formulaId: {
            type: "string",
            enum: ["cg_usdt_krw", "cg_usdt_usd__frank_usd_krw"],
          },
          sources: {
            type: "array",
            minItems: 1,
            items: { type: "string", enum: ["coingecko", "frankfurter"] },
            description: "yahoo_jp FORBIDDEN",
          },
          usdtKrw: decimal,
          usdtUsd: decimal,
          usdKrwFrank: decimal,
          capturedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "opportunity-pricing.v1.json",
    meta(
      "opportunity-pricing.v1.json",
      "OpportunityPricingV1",
      "§36 Admin price SSOT · §0.0.4 compare. NEVER: yahoo_jp · legacy duplicate price keys.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "buyMarketId",
          "buyMarketLabelKo",
          "buyPriceUsdt",
          "sellMarketId",
          "sellMarketLabelKo",
          "sellPriceUsdt",
          "grossSpreadUsdt",
          "costBufferUsdt",
          "platformMarginUsdt",
          "expectedProfitUsdt",
          "compareReady",
          "capitalBand",
          "useAdminOverride",
          "pricingSource",
        ],
        properties: {
          buyMarketId: marketId,
          buyMarketLabelKo: { type: "string" },
          buyPriceUsdt: decimal,
          sellMarketId: marketId,
          sellMarketLabelKo: { type: "string" },
          sellPriceUsdt: decimal,
          grossSpreadUsdt: decimal,
          costBufferUsdt: decimal,
          platformMarginUsdt: decimal,
          expectedProfitUsdt: decimal,
          compareReady: { type: "boolean" },
          capitalBand: capitalBand,
          adminBuyUsdt: decimal,
          adminSellUsdt: decimal,
          adminMarginPct: decimal,
          useAdminOverride: { type: "boolean" },
          pricingSource: {
            type: "string",
            enum: ["adapter", "admin", "blended"],
          },
          lastAdapterSyncAt: iso8601,
          lastAdminEditBy: uuidLike,
        },
      }
    )
  )
);

written.push(
  write(
    "opportunity-card.v1.json",
    meta(
      "opportunity-card.v1.json",
      "OpportunityCardV1",
      "Engine §4.1 · available requires assetImageUrl+compareReady. NEVER: yahoo_jp · executionMode≠orchestrate · sellSuccessRate as Rule.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "pricingVersion",
          "pricedAt",
          "expectedProfitUsdt",
          "expectedProfitKrwApprox",
          "fxSnapshotId",
          "estimatedDurationSec",
          "aiConfidenceScore",
          "difficulty",
          "tags",
          "requiredCapitalUsdt",
          "executionMode",
          "category",
          "assetId",
          "assetLabel",
          "assetImageUrl",
          "assetImageSource",
          "assetImageAltKo",
          "arbitrageType",
          "arbitrageTypeKo",
          "staleAt",
          "status",
        ],
        properties: {
          id: uuidLike,
          pricingVersion: { type: "integer", minimum: 1 },
          pricedAt: iso8601,
          expectedProfitUsdt: decimal,
          expectedProfitKrwApprox: { type: "number" },
          fxSnapshotId: uuidLike,
          estimatedDurationSec: { type: "integer", minimum: 1 },
          aiConfidenceScore: { type: "number", minimum: 0, maximum: 100 },
          difficulty: {
            type: "string",
            enum: ["beginner", "normal", "premium", "hot"],
          },
          tags: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "instant",
                "high_profit",
                "ai_pick",
                "beginner",
                "time_sensitive",
              ],
            },
          },
          requiredCapitalUsdt: decimal,
          pricing: { $ref: ID("opportunity-pricing.v1.json") },
          expectedSellDays: {
            type: "number",
            description: "DEPRECATED user surface · Admin historical only",
          },
          sellSuccessRate: {
            type: "number",
            description: "Historical display only · NEVER Rule input",
          },
          sellSuccessWindowDays: { type: "integer", minimum: 1 },
          sellSuccessAsOf: iso8601,
          riskScore: { type: "integer", minimum: 1, maximum: 5 },
          executionMode: { const: "orchestrate" },
          executionPlatforms: {
            type: "array",
            items: { type: "string" },
            description: "INTERNAL · ebay_*|admin only · yahoo_jp FORBIDDEN · user UI 0",
          },
          category: category,
          assetId: uuidLike,
          assetLabel: { type: "string" },
          assetImageUrl: { type: "string", format: "uri" },
          assetImageSource: imageSource,
          assetImageAltKo: { type: "string" },
          assetIcon: { type: "string" },
          arbitrageType: {
            type: "string",
            enum: ["price", "fx", "benefit", "limited", "resale"],
          },
          arbitrageTypeKo: { type: "string", minLength: 1 },
          staleAt: iso8601,
          status: {
            type: "string",
            enum: ["available", "paused", "expired", "circuit_open"],
          },
        },
      }
    )
  )
);

written.push(
  write(
    "user-opportunity-override.v1.json",
    meta(
      "user-opportunity-override.v1.json",
      "UserOpportunityOverrideV1",
      "Admin §9.8.9. NEVER: balance UPDATE · RNG success · compareReady false→true · cross-SKU images.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "opportunityId",
          "reason",
          "updatedByAdminId",
          "updatedAt",
        ],
        properties: {
          userId: uuidLike,
          opportunityId: uuidLike,
          hidden: { type: "boolean" },
          forceShow: {
            type: "boolean",
            description: "Mutually exclusive with hidden",
          },
          pinOrder: {
            type: "integer",
            minimum: 0,
            description: "Max 10 pins per user Day-1",
          },
          marginPctOverride: decimal,
          expectedProfitUsdtOverride: {
            ...decimal,
            description: "Display/participate guard · NOT ledger credit",
          },
          capitalBandForce: capitalBand,
          reason: { type: "string", minLength: 10 },
          updatedByAdminId: uuidLike,
          updatedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "user-match-policy-override.v1.json",
    meta(
      "user-match-policy-override.v1.json",
      "UserMatchPolicyOverrideV1",
      "Admin §9.8.10. NEVER: successRatePercent · winRate · rngSuccess.",
      {
        type: "object",
        additionalProperties: false,
        required: ["userId", "reason", "updatedByAdminId", "updatedAt"],
        properties: {
          userId: uuidLike,
          matchStrictnessOverride: matchStrictness,
          minProfitUsdt: decimal,
          staleAllowanceSec: { type: "integer", minimum: 0 },
          maxRematchCount: { type: "integer", minimum: 0 },
          dailyUserMatchCap: { type: "integer", minimum: 0 },
          reason: { type: "string", minLength: 10 },
          updatedByAdminId: uuidLike,
          updatedAt: iso8601,
        },
        not: {
          anyOf: [
            { required: ["successRatePercent"] },
            { required: ["winRate"] },
            { required: ["rngSuccess"] },
          ],
        },
      }
    )
  )
);

written.push(
  write(
    "tendency-memo.v1.json",
    meta(
      "tendency-memo.v1.json",
      "TendencyMemoV1",
      "Admin §9.8.10 · user-nonvisible. NEVER: expose to user surface / push / 퍼뜩 Fact.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "userId",
          "bodyKo",
          "tags",
          "createdByAdminId",
          "createdAt",
        ],
        properties: {
          id: uuidLike,
          userId: uuidLike,
          bodyKo: { type: "string", maxLength: 500 },
          tags: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "risk",
                "vip_care",
                "churn",
                "deposit_hesitant",
                "high_volume",
                "other",
              ],
            },
          },
          createdByAdminId: uuidLike,
          createdAt: iso8601,
          updatedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "execution-policy.v1.json",
    meta(
      "execution-policy.v1.json",
      "ExecutionPolicyV1",
      "§48 real conditions + presentation. FORBIDDEN key: successRatePercent.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "matchStrictness",
          "minProfitUsdt",
          "staleAllowanceSec",
          "maxRematchCount",
          "retryWaitSec",
          "slippageBoundBps",
          "dailyUserMatchCap",
          "dailyOppSlotsDefault",
          "autoCancelOnShortfall",
          "presentation",
          "updatedAt",
          "updatedByAdminId",
        ],
        properties: {
          matchStrictness: matchStrictness,
          minProfitUsdt: decimal,
          staleAllowanceSec: { type: "integer", minimum: 0 },
          maxRematchCount: { type: "integer", minimum: 0 },
          retryWaitSec: { type: "integer", minimum: 0 },
          slippageBoundBps: { type: "integer", minimum: 0 },
          dailyUserMatchCap: { type: "integer", minimum: 0 },
          dailyOppSlotsDefault: { type: "integer", minimum: 0 },
          autoCancelOnShortfall: { type: "boolean" },
          membershipBandOverlayEnabled: { type: "boolean" },
          feed: {
            type: "object",
            additionalProperties: false,
            description:
              "Engine §0.0.5.1 balance-aware feed · nearMissCap SSOT (adapters MUST NOT own this)",
            required: ["nearMissCapUsdt"],
            properties: {
              nearMissCapUsdt: {
                type: "string",
                pattern: "^[0-9]+(\\.[0-9]+)?$",
                description:
                  "Absolute USDT near-miss window · Day-1 default resolve = max(50, principal×0.25) when policy absent",
              },
            },
          },
          presentation: {
            type: "object",
            additionalProperties: false,
            required: ["durationSecMin", "durationSecMax", "steps"],
            properties: {
              durationSecMin: { type: "integer", minimum: 1 },
              durationSecMax: { type: "integer", minimum: 1 },
              steps: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "product_check",
                    "price_compare",
                    "matching",
                    "settle_prep",
                    "credit",
                  ],
                },
                minItems: 5,
                maxItems: 5,
              },
            },
          },
          updatedAt: iso8601,
          updatedByAdminId: uuidLike,
        },
        not: { required: ["successRatePercent"] },
      }
    )
  )
);

written.push(
  write(
    "trade-execution-state.v1.json",
    meta(
      "trade-execution-state.v1.json",
      "TradeExecutionStateV1",
      "§48 step/result · includes MATCH_TIMEOUT. NEVER: RNG→MATCH_SUCCESS · presentation timer credits ledger.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "tradeId",
          "opportunityId",
          "pricingVersion",
          "status",
          "stepIndex",
          "progressPct",
          "expectedProfitUsdt",
          "asset",
        ],
        properties: {
          tradeId: uuidLike,
          opportunityId: uuidLike,
          pricingVersion: { type: "integer", minimum: 1 },
          status: {
            type: "string",
            enum: [
              "running",
              "requeue",
              "success",
              "safe_stop",
              "cancelled",
              "failed",
            ],
          },
          resultCode: {
            type: "string",
            enum: [
              "MATCH_SUCCESS",
              "REQUEUE",
              "PRICE_MOVED",
              "BELOW_MIN_PROFIT",
              "CANCELLED_BY_USER",
              "CIRCUIT_OPEN",
              "SYSTEM_FAILED",
              "MATCH_TIMEOUT",
            ],
          },
          stepIndex: { type: "integer", enum: [0, 1, 2, 3, 4] },
          progressPct: { type: "number", minimum: 0, maximum: 100 },
          logLine: { type: "string" },
          expectedProfitUsdt: decimal,
          settledProfitUsdt: decimal,
          asset: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label"],
            properties: {
              id: uuidLike,
              label: { type: "string" },
              iconUrl: { type: "string", format: "uri" },
              ref: { type: "string" },
            },
          },
        },
      }
    )
  )
);

const toastCodes = [
  ["INSUFFICIENT_BALANCE", "😅 USDT가 부족해요. 입금 후 다시 시도해 주세요", "participate"],
  ["KYC_WITHDRAW_REQUIRED", "🔐 출금하려면 본인 확인이 필요해요! 1번만 하면 돼요 😊", "withdraw tap → /me/kyc"],
  ["KYC_PENDING", "⏳ 본인 확인을 검토 중이에요. 잠시만 기다려 주세요 🙏", "kyc submitted"],
  ["KYC_REJECTED", "😔 본인 확인이 반려됐어요. 다시 신청해 주세요", "kyc rejected"],
  ["KYC_APPROVED", "✅ 본인 확인 완료! 이제 출금할 수 있어요 🎉", "admin approve"],
  ["CIRCUIT_OPEN", "⏸️ 잠시 거래를 멈췄어요. 곧 다시 열릴게요", "any money"],
  ["RATE_LIMITED", "🐢 잠깐만요! 너무 빠르게 눌렀어요", "click spam"],
  ["OPPORTUNITY_EXPIRED", "⏰ 이 기회는 방금 마감됐어요", "stale participate"],
  ["EXEC_SAFE_STOP_PRICE", "🛡️ 가격이 움직여서 이번엔 안전하게 멈췄어요", "PRICE_MOVED"],
  ["EXEC_SAFE_STOP_MIN", "🛡️ 예상보다 적어져서 진행하지 않았어요 (잔액 그대로)", "BELOW_MIN_PROFIT"],
  ["EXEC_SUCCESS", "🎉 수익이 들어왔어요", "settlement.completed"],
  ["EXEC_CANCELLED", "중단했어요. 잔액은 그대로예요", "user cancel"],
  ["WITHDRAW_PROFIT_OK", "🎉 수익 출금을 신청했어요", "profit withdraw"],
  ["WITHDRAW_PRINCIPAL_WARN", "원금을 빼면 다음 기회 참여가 줄어들 수 있어요", "principal confirm"],
  ["INSUFFICIENT_PROFIT", "출금 가능한 수익이 부족해요", "profit mode"],
  ["INSUFFICIENT_PRINCIPAL", "근무 중 원금이 부족해요. 충전 후 참여해 주세요", "participate"],
  ["PRACTICE_NOT_WITHDRAWABLE", "연습 잔액은 출금할 수 없어요", "practice"],
  ["PRACTICE_GRANTED", "🎁 연습 잔액이 생겼어요. 출금은 안 돼요", "§51.7 welcome / referee practice"],
  ["PRACTICE_EXPIRED", "⏰ 연습 잔액이 만료됐어요", "§51.7 practice expire cron"],
  ["MERGE_PROFIT_OK", "수익을 원금에 합쳤어요. 다음 기회에 바로 쓸 수 있어요", "merge"],
  ["DEPOSIT_DETECTED", "👀 USDT {amount} 입금 감지! 확정까지 잠시만요", "§43 1 conf"],
  ["DEPOSIT_CONFIRMED", "🎉 USDT {amount} 입금 확정! 바로 거래할 수 있어요", "§43 19 conf + ledger"],
  ["SWEEPER_TRX_LOW", "🔴 Treasury TRX stake 부족 · 집금 일시 중지 (유저 잔액 유지)", "§43.2.1 Admin alert · user surface 0"],
  ["KRW_DEPOSIT_SUBMITTED", "📝 원화 입금 신청 접수! 송금 후 확인해 드릴게요", "krw request"],
  ["KRW_DEPOSIT_APPROVED", "✅ 원화 입금이 확인됐어요. 잔액에 반영됐어요 🎉", "admin approve"],
  ["KRW_DEPOSIT_REJECTED", "😔 원화 입금을 확인할 수 없어요. 내역에서 이유를 확인해 주세요", "admin reject"],
  ["KRW_DEPOSIT_EXPIRED", "⏰ 입금 신청이 만료됐어요. 다시 신청해 주세요", "TTL expire"],
  ["DEPOSIT_DISPUTE_SUBMITTED", "📝 문의를 접수했어요. 확인 후 안내드릴게요", "§41.6 wrong-chain CS"],
  ["DEPOSIT_DISPUTE_CREDITED", "✅ 확인했어요. 잔액에 반영됐어요 🎉", "admin wallet?tab=disputes credit"],
  ["DEPOSIT_DISPUTE_REJECTED", "😔 이번 건은 반영하기 어려워요. 내역에서 이유를 확인해 주세요", "admin wallet?tab=disputes reject"],
  ["WITHDRAW_SUBMITTED", "📤 출금 요청을 받았어요", "withdraw"],
  ["TRADE_COMPLETE", "🎉 +{amount} USDT 지급 완료!", "settlement"],
  ["NETWORK_ERROR", "📡 연결이 불안정해요. 다시 시도해 주세요", "fetch fail"],
  ["SESSION_EXPIRED", "🔐 다시 로그인해 주세요", "401"],
  ["ACCOUNT_FROZEN", "⏸️ 계정이 일시 정지됐어요. 고객센터에 문의해 주세요", "admin freeze"],
  ["ACCOUNT_BANNED", "🚫 이용이 제한된 계정이에요", "admin ban"],
  ["WITHDRAW_BLOCKED", "📤 출금이 일시 중지됐어요", "admin restrict"],
  ["MATCH_BLOCKED", "⏸️ 지금은 매칭을 진행할 수 없어요. 고객센터에 문의해 주세요", "matchBlocked"],
  ["WITHDRAW_APPLY_BLOCKED", "📤 지금은 출금 신청을 받을 수 없어요. 고객센터에 문의해 주세요", "withdrawApplyBlocked"],
  ["PASSWORD_RESET_BY_OPS", "🔐 로그인 비밀번호가 재설정됐어요. 다시 로그인해 주세요", "admin password reset"],
  ["WITHDRAW_PIN_RESET", "🔑 출금 비밀번호가 초기화됐어요. 다음 출금 때 다시 등록해 주세요", "admin PIN reset"],
  ["WITHDRAW_STEP_UP_REQUIRED", "🔐 출금하려면 본인 확인이 한 번 더 필요해요", "§43.6 step-up missing"],
  ["PIN_REQUIRED", "🔑 출금 비밀번호를 다시 등록해 주세요", "PIN wipe or unset"],
  ["WEBAUTHN_REVOKED", "🔐 패스키가 해제됐어요. 이메일·비밀번호로 본인 확인해 주세요", "admin webauthn revoke"],
  ["STEP_UP_CHALLENGE_EXPIRED", "⏱️ 확인 시간이 지났어요. 다시 시도해 주세요", "§43.6 challenge TTL 60s"],
  ["BALANCE_ADJUSTED", "💰 잔액이 조정됐어요", "admin ledger adjust"],
  ["DEPOSIT_CONFIG_UPDATED", "🔄 입금 정보가 업데이트됐어요", "SSE optional"],
  ["MIN_HOLDING", "⏳ 원금은 충전 후 {hours}시간이 지나야 출금할 수 있어요", "§11.2"],
  ["WITHDRAW_FEE_HINT", "💸 이체 수수료 {fee} USDT가 빠져요", "withdraw confirm"],
  ["REFERRAL_BOUND", "🤝 초대가 연결됐어요!", "code bind L1"],
  ["REFERRAL_L2_PENDING", "⏳ 친구 첫충전 보너스를 확인 중이에요", "L2 hold"],
  ["REFERRAL_L2_RELEASED", "🎉 초대 보너스가 수익에 들어왔어요", "L2 release"],
  ["REFERRAL_CLAWBACK", "↩️ 어뷰징으로 초대 보너스가 회수됐어요", "clawback"],
  ["REFERRAL_HELD", "⏸️ 초대 보너스가 잠시 보류됐어요", "risk hold"],
  ["REFERRAL_CAP", "📊 오늘 공유 보내기 한도에 도달했어요", "share/day"],
  ["REFERRAL_POOL_WAIT", "⏳ 보너스를 준비 중이에요. 초대는 유지돼요", "queued_pool"],
  ["REFERRAL_SHARE_LIMIT", "🐢 공유는 하루 {n}번까지예요", "share rate"],
  ["CAMPAIGN_CLAIM_OK", "🎁 이벤트 보너스를 받았어요", "campaign claim"],
  ["CAMPAIGN_ENDED", "⏰ 이 이벤트는 종료됐어요", "claim after end"],
  ["CAMPAIGN_BUDGET", "📭 이벤트 예산이 마감됐어요", "budget_exhausted"],
  ["CAMPAIGN_DUP", "✋ 이미 받은 보너스예요", "idempotent claim"],
  ["NOTICE_PUSH", "📢 새 공지가 있어요", "notice live+push"],
  ["PEOTTEOK_LLM_BUSY", "🤖 퍼뜩이 잠시 바빠요. 조금 뒤 다시 물어봐 주세요", "§47.13 G degrade"],
];

written.push(
  write(
    "toast-codes.v1.json",
    meta(
      "toast-codes.v1.json",
      "ToastCodesCatalogV1",
      "UI §8.2 toast code catalog · body SSOT with copy/ko. NEVER: raw English code on user toast.",
      {
        type: "object",
        additionalProperties: false,
        required: ["version", "codes"],
        properties: {
          version: { type: "integer", const: 1 },
          codes: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["code", "toastKo", "trigger"],
              properties: {
                code: { type: "string", pattern: "^[A-Z][A-Z0-9_]+$" },
                toastKo: { type: "string", minLength: 1 },
                trigger: { type: "string", minLength: 1 },
              },
            },
          },
        },
        default: {
          version: 1,
          codes: toastCodes.map(([code, toastKo, trigger]) => ({
            code,
            toastKo,
            trigger,
          })),
        },
      }
    )
  )
);

written.push(
  write(
    "participate-request.v1.json",
    meta(
      "participate-request.v1.json",
      "ParticipateRequestV1",
      "Engine §48.13.1 POST body · pricingVersion + minProfitUsdt.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "opportunityId",
          "pricingVersion",
          "minProfitUsdt",
          "amountUsdt",
          "idempotencyKey",
        ],
        properties: {
          opportunityId: uuidLike,
          pricingVersion: { type: "integer", minimum: 1 },
          minProfitUsdt: decimal,
          amountUsdt: decimal,
          idempotencyKey: { type: "string", minLength: 8 },
        },
      }
    )
  )
);

written.push(
  write(
    "participate-proof.v1.json",
    meta(
      "participate-proof.v1.json",
      "ParticipateProofV1",
      "UI §51.16 proof-at-participate · SHA256 canonical JSON.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "tradeId",
          "pricingVersion",
          "buyPriceUsdt",
          "sellPriceUsdt",
          "expectedProfitUsdt",
          "fxSnapshotId",
          "proofHash",
          "capturedAt",
        ],
        properties: {
          tradeId: uuidLike,
          pricingVersion: { type: "integer", minimum: 1 },
          buyPriceUsdt: decimal,
          sellPriceUsdt: decimal,
          expectedProfitUsdt: decimal,
          fxSnapshotId: uuidLike,
          proofHash: {
            type: "string",
            pattern: "^[a-f0-9]{64}$",
            description: "SHA256 hex of canonical JSON",
          },
          capturedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "simulation-report.v1.json",
    meta(
      "simulation-report.v1.json",
      "SimulationReportV1",
      "Engine §51.4 M0.5 simulation-engine report (+ SimulationFeasibility $defs).",
      {
        $defs: {
          SimulationFeasibility: {
            type: "object",
            additionalProperties: false,
            required: ["opportunityId", "payoutFeasible"],
            properties: {
              opportunityId: uuidLike,
              payoutFeasible: { type: "boolean" },
              reasonKo: { type: "string" },
            },
          },
        },
        type: "object",
        additionalProperties: false,
        required: [
          "runId",
          "asOf",
          "horizonHours",
          "opportunityPublishRate",
          "spreadDistribution",
          "payoutFeasibilityScore",
          "worstCasePlatformDrainUsdt",
          "uxDisplayAccuracy",
          "adapterMatchFailureRate",
        ],
        properties: {
          runId: uuidLike,
          asOf: iso8601,
          horizonHours: { type: "integer", const: 24 },
          opportunityPublishRate: { type: "number", minimum: 0, maximum: 1 },
          spreadDistribution: {
            type: "object",
            additionalProperties: false,
            required: ["p50", "p10", "p90"],
            properties: {
              p50: decimal,
              p10: decimal,
              p90: decimal,
            },
          },
          payoutFeasibilityScore: { type: "number", minimum: 0, maximum: 1 },
          worstCasePlatformDrainUsdt: decimal,
          uxDisplayAccuracy: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["field", "sample", "mismatch"],
              properties: {
                field: { type: "string" },
                sample: { type: "number" },
                mismatch: { type: "number", minimum: 0 },
              },
            },
          },
          adapterMatchFailureRate: { type: "number", minimum: 0, maximum: 1 },
          feasibility: {
            type: "array",
            items: { $ref: "#/$defs/SimulationFeasibility" },
          },
        },
      }
    )
  )
);

written.push(
  write(
    "simulation-gate.v1.json",
    meta(
      "simulation-gate.v1.json",
      "SimulationGateV1",
      "Engine §51.4 M0.5 S1~S4 gate evaluation (+ Growth ON eligibility).",
      {
        type: "object",
        additionalProperties: false,
        required: ["s1", "s2", "s3", "s4", "overallPass", "thresholds"],
        properties: {
          s1: {
            type: "object",
            required: ["id", "pass", "failAction"],
            properties: {
              id: { const: "S1" },
              pass: { type: "boolean" },
              failAction: { const: "block_publish" },
              totalMismatch: { type: "number" },
              threshold: { type: "number" },
            },
          },
          s2: {
            type: "object",
            required: ["id", "pass", "failAction"],
            properties: {
              id: { const: "S2" },
              pass: { type: "boolean" },
              failAction: { const: "admin_alert" },
              reason: { type: "string" },
              drainUsdt: decimal,
              reserveUsdt: { type: ["string", "null"] },
              maxAllowedUsdt: { type: ["string", "null"] },
              thresholdPct: { const: "0.10" },
            },
          },
          s3: {
            type: "object",
            required: ["id", "pass", "failAction", "threshold"],
            properties: {
              id: { const: "S3" },
              pass: { type: "boolean" },
              failAction: { const: "hide_feed" },
              score: { type: ["number", "null"] },
              threshold: { const: 0.85 },
            },
          },
          s4: {
            type: "object",
            required: ["id", "pass", "failAction", "threshold"],
            properties: {
              id: { const: "S4" },
              pass: { type: "boolean" },
              failAction: { const: "adapter_alert" },
              rate: { type: ["number", "null"] },
              threshold: { const: 0.15 },
            },
          },
          overallPass: { type: "boolean" },
          thresholds: {
            type: "object",
            required: [
              "s2ReserveDrainMaxPct",
              "s3PayoutFeasibilityMin",
              "s4AdapterMatchFailureRateMax",
              "growthPassMaxAgeHours",
            ],
            properties: {
              s2ReserveDrainMaxPct: { const: "0.10" },
              s3PayoutFeasibilityMin: { const: 0.85 },
              s4AdapterMatchFailureRateMax: { const: 0.15 },
              growthPassMaxAgeHours: { const: 24 },
            },
          },
        },
      }
    )
  )
);

written.push(
  write(
    "referral-program.v1.json",
    meta(
      "referral-program.v1.json",
      "ReferralProgramConfigV1",
      "Money §51.5 · FORBIDDEN field capPerReferrerMonth · invite-count reject · principal credit for rewards.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "enabled",
          "rewardsEnabled",
          "l1RefereeExtraPracticeUsdt",
          "l2ReferrerPct",
          "l2ReferrerHardCapUsdt",
          "l2RefereePracticeCapUsdt",
          "l3ReferrerFlatUsdt",
          "l3ReferrerHardCapUsdt",
          "l3RefereeRewardKind",
          "clawbackHoursL2",
          "minRefereeDepositUsdt",
          "sharePerUserPerDay",
          "promoPoolTopUpPolicy",
          "tiers",
        ],
        properties: {
          enabled: { type: "boolean" },
          rewardsEnabled: { type: "boolean" },
          l1RefereeExtraPracticeUsdt: decimal,
          l2ReferrerPct: decimal,
          l2ReferrerHardCapUsdt: decimal,
          l2RefereePracticeCapUsdt: decimal,
          l3ReferrerFlatUsdt: decimal,
          l3ReferrerHardCapUsdt: decimal,
          l3RefereeRewardKind: {
            type: "string",
            enum: ["fee_coupon", "practice", "none"],
          },
          clawbackHoursL2: { type: "integer", minimum: 0 },
          minRefereeDepositUsdt: decimal,
          sharePerUserPerDay: { type: "integer", minimum: 1 },
          systemPayoutCapPerDayUsdt: decimal,
          promoPoolTopUpPolicy: {
            type: "string",
            enum: ["manual", "pct_of_prior_week_margin"],
          },
          promoPoolTopUpPct: decimal,
          tiers: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "minValidInvites", "perks"],
              properties: {
                id: {
                  type: "string",
                  enum: ["seed", "flame", "rocket", "whale_maker"],
                },
                minValidInvites: { type: "integer", minimum: 0 },
                perks: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
        not: { required: ["capPerReferrerMonth"] },
      }
    )
  )
);

written.push(
  write(
    "referral-edge.v1.json",
    meta(
      "referral-edge.v1.json",
      "ReferralEdgeV1",
      "Money §51.5 edge · status includes queued_pool · levelsAchieved L1|L2|L3.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "referrerUserId",
          "refereeUserId",
          "code",
          "boundAt",
          "levelsAchieved",
          "status",
          "idempotencyKeys",
        ],
        properties: {
          id: uuidLike,
          referrerUserId: uuidLike,
          refereeUserId: uuidLike,
          code: { type: "string", minLength: 1 },
          boundAt: iso8601,
          levelsAchieved: {
            type: "array",
            items: { type: "string", enum: ["L1", "L2", "L3"] },
            uniqueItems: true,
          },
          status: {
            type: "string",
            enum: [
              "bound",
              "l1_done",
              "l2_pending_hold",
              "l2_released",
              "l3_done",
              "held_risk",
              "clawed_back",
              "queued_pool",
            ],
          },
          qualifyingDepositUsdt: decimal,
          computedL2ReferrerUsdt: decimal,
          idempotencyKeys: {
            type: "array",
            items: { type: "string" },
          },
        },
      }
    )
  )
);

written.push(
  write(
    "support-ticket.v1.json",
    meta(
      "support-ticket.v1.json",
      "SupportTicketV1",
      "§51.6 CS ticket. NEVER: balance adjust from ticket UI.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "userId",
          "category",
          "subjectKo",
          "bodyKo",
          "status",
          "slaDueAt",
        ],
        properties: {
          id: uuidLike,
          userId: uuidLike,
          category: {
            type: "string",
            enum: ["deposit", "withdraw", "trade", "account", "other"],
          },
          subjectKo: { type: "string", minLength: 1 },
          bodyKo: { type: "string", minLength: 1 },
          status: {
            type: "string",
            enum: ["open", "pending_user", "resolved", "escalated"],
          },
          linkedTradeId: uuidLike,
          linkedTxHash: { type: "string" },
          slaDueAt: iso8601,
          createdAt: iso8601,
          updatedAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "admin-rbac.v1.json",
    meta(
      "admin-rbac.v1.json",
      "AdminRbacV1",
      "Admin §9.9 · CONSTITUTION/40 role×capability matrix. NEVER: admin routes in apps/web · shared JWT with users.",
      {
        type: "object",
        additionalProperties: false,
        required: ["version", "roles"],
        properties: {
          version: { type: "integer", const: 1 },
          roles: {
            type: "array",
            minItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "labelKo", "capabilities"],
              properties: {
                id: {
                  type: "string",
                  enum: ["super", "finance", "cs", "risk", "marketing"],
                },
                labelKo: { type: "string" },
                capabilities: {
                  type: "object",
                  additionalProperties: {
                    type: "string",
                    enum: ["none", "read", "write"],
                  },
                },
              },
            },
          },
        },
        default: {
          version: 1,
          roles: [
            {
              id: "super",
              labelKo: "최고관리자",
              capabilities: {
                all: "write",
                rbac: "write",
                circuit: "write",
                growth: "write",
                userOpportunityOverride: "write",
                userMatchPolicy: "write",
                userMembershipForce: "write",
                loginPasswordReset: "write",
                withdrawPinReset: "write",
                financeExport: "write",
                balanceAdjust: "write",
              },
            },
            {
              id: "finance",
              labelKo: "재무",
              capabilities: {
                wallet: "write",
                ledger: "write",
                financeExport: "write",
                withdrawApprove: "write",
                balanceAdjust: "write",
                userOpportunityOverride: "write",
                userMatchPolicy: "write",
                userMembershipForce: "write",
                withdrawPinReset: "write",
                loginPasswordReset: "none",
                growth: "none",
              },
            },
            {
              id: "cs",
              labelKo: "고객지원",
              capabilities: {
                users: "write",
                tendencyMemo: "write",
                kyc: "write",
                opsMessage: "write",
                supportTicket: "write",
                loginPasswordReset: "write",
                withdrawPinReset: "write",
                userOpportunityOverride: "read",
                userMatchPolicy: "read",
                balanceAdjust: "none",
                financeExport: "none",
              },
            },
            {
              id: "risk",
              labelKo: "리스크",
              capabilities: {
                risk: "write",
                compliance: "write",
                freezeBan: "write",
                ipBlock: "write",
                financeExport: "none",
                growth: "none",
              },
            },
            {
              id: "marketing",
              labelKo: "마케팅",
              capabilities: {
                growth: "write",
                attribution: "write",
                content: "write",
                financeExport: "none",
                balanceAdjust: "none",
                userOpportunityOverride: "none",
                userMatchPolicy: "none",
              },
            },
          ],
        },
      }
    )
  )
);

written.push(
  write(
    "user-financial-summary.v1.json",
    meta(
      "user-financial-summary.v1.json",
      "UserFinancialSummaryV1",
      "Admin §9.8.7·§39 · netInflowUsdt REQUIRED · buckets. NEVER: demo/G4 into finance · label netInflow as 수익.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "totalDepositUsdt",
          "totalWithdrawUsdt",
          "netInflowUsdt",
          "spreadProfitUsdt",
          "platformMarginUsdt",
          "balanceUsdt",
          "buckets",
          "tradeCount",
          "tradeSuccessRate",
        ],
        properties: {
          userId: uuidLike,
          asOf: iso8601,
          totalDepositUsdt: decimal,
          totalWithdrawUsdt: decimal,
          netInflowUsdt: {
            ...decimal,
            description: "totalDepositUsdt − totalWithdrawUsdt · REQUIRED KPI",
          },
          spreadProfitUsdt: decimal,
          platformMarginUsdt: decimal,
          balanceUsdt: decimal,
          withdrawFeeUsdt: decimal,
          netPnlUsdt: decimal,
          depositKrwApprox: { type: "number" },
          buckets: {
            type: "object",
            additionalProperties: false,
            required: ["principal", "profit", "locked", "practice"],
            properties: {
              principal: decimal,
              profit: decimal,
              locked: decimal,
              practice: decimal,
            },
          },
          tradeCount: { type: "integer", minimum: 0 },
          tradeSuccessRate: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description:
              "MATCH_SUCCESS/(SUCCESS+PRICE_MOVED+BELOW_MIN) · ≠ sellSuccessRate",
          },
          counts: {
            type: "object",
            additionalProperties: false,
            properties: {
              deposits: { type: "integer", minimum: 0 },
              withdrawals: { type: "integer", minimum: 0 },
              settlements: { type: "integer", minimum: 0 },
            },
          },
          lastDepositAt: iso8601,
          lastWithdrawAt: iso8601,
          fxSnapshotId: uuidLike,
        },
      }
    )
  )
);

written.push(
  write(
    "user-attribution.v1.json",
    meta(
      "user-attribution.v1.json",
      "UserAttributionV1",
      "Infra §31 · CAPI attribution. NEVER: CAPI before consent · fingerprint ads · PII raw to CAPI.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "userId",
          "firstTouch",
          "lastTouch",
          "consentMarketing",
          "consentAt",
          "capiSentEvents",
        ],
        properties: {
          userId: uuidLike,
          firstTouch: { $ref: "#/$defs/Touch" },
          lastTouch: { $ref: "#/$defs/Touch" },
          consentMarketing: { type: "boolean" },
          consentAt: iso8601,
          firstDepositAt: iso8601,
          firstDepositUsdt: decimal,
          capiSentEvents: { type: "array", items: { type: "string" } },
        },
        $defs: {
          Touch: {
            type: "object",
            additionalProperties: false,
            required: ["landingVariant"],
            properties: {
              utmSource: { type: "string" },
              utmMedium: { type: "string" },
              utmCampaign: { type: "string" },
              utmContent: { type: "string" },
              utmTerm: { type: "string" },
              gclid: { type: "string" },
              fbclid: { type: "string" },
              ttclid: { type: "string" },
              landingVariant: { type: "string" },
            },
          },
        },
      }
    )
  )
);

written.push(
  write(
    "ui-copy-glossary.v1.json",
    meta(
      "ui-copy-glossary.v1.json",
      "UiCopyGlossaryV1",
      "UI §27 · enum/code → koLabel API contract. NEVER: L2 English on L1 · Margin/Arbitrage/ROI/PnL on user UI.",
      {
        type: "object",
        additionalProperties: false,
        required: ["version", "entries"],
        properties: {
          version: { type: "integer", const: 1 },
          entries: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["code", "koLabel", "surface"],
              properties: {
                code: { type: "string" },
                koLabel: { type: "string" },
                surface: {
                  type: "string",
                  enum: ["user", "admin", "both"],
                },
                forbiddenAliases: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
        default: {
          version: 1,
          entries: [
            {
              code: "Spread",
              koLabel: "차익 금액",
              surface: "user",
              forbiddenAliases: ["스프레드", "Spread"],
            },
            {
              code: "Wallet",
              koLabel: "내 지갑",
              surface: "user",
              forbiddenAliases: ["Wallet"],
            },
            {
              code: "KYC",
              koLabel: "본인 확인",
              surface: "user",
              forbiddenAliases: ["KYC", "신원인증"],
            },
            {
              code: "TRC20",
              koLabel: "트론",
              surface: "user",
              forbiddenAliases: ["TRC20", "ERC20", "BEP20"],
            },
            {
              code: "principal",
              koLabel: "근무 중 원금",
              surface: "user",
            },
            {
              code: "profit",
              koLabel: "출금 가능 수익",
              surface: "user",
            },
            {
              code: "participate",
              koLabel: "수익 벌기",
              surface: "user",
              forbiddenAliases: ["매칭 참여", "구매", "판매"],
            },
            {
              code: "MATCH_SUCCESS",
              koLabel: "조건이 맞았어요",
              surface: "user",
            },
            {
              code: "Margin",
              koLabel: "내 수익",
              surface: "user",
              forbiddenAliases: ["Margin", "마진", "ROI", "PnL"],
            },
            {
              code: "Arbitrage",
              koLabel: "시세차익",
              surface: "user",
              forbiddenAliases: ["Arbitrage", "아비트라지"],
            },
          ],
        },
      }
    )
  )
);

written.push(
  write(
    "user-twin.v1.json",
    meta(
      "user-twin.v1.json",
      "UserTwinV1",
      "Engine §47 slow prefs/behavior · non-numeric money. NEVER: cache balanceUsdt/expectedProfitUsdt/live quotes.",
      {
        type: "object",
        additionalProperties: false,
        required: ["userId", "updatedAt"],
        properties: {
          userId: uuidLike,
          preferredCapitalBand: capitalBand,
          categoryInterest: {
            type: "array",
            items: category,
          },
          toneBand: { type: "string", enum: ["young", "mid", "senior"] },
          objectionPatterns: {
            type: "array",
            items: { type: "string" },
          },
          twinSnapshotId: uuidLike,
          updatedAt: iso8601,
        },
        not: {
          anyOf: [
            { required: ["balanceUsdt"] },
            { required: ["expectedProfitUsdt"] },
            { required: ["liveQuote"] },
          ],
        },
      }
    )
  )
);

written.push(
  write(
    "fact-card.v1.json",
    meta(
      "fact-card.v1.json",
      "FactCardV1",
      "Engine §47.4 Fact freshness. Sources: ledger|opportunity|kyc|fx|...",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "source",
          "captured_at",
          "expires_at",
          "confidence",
          "payload",
        ],
        properties: {
          source: {
            type: "string",
            enum: [
              "ledger",
              "opportunity",
              "kyc",
              "fx",
              "wallet",
              "membership",
              "referral",
              "ux_prefs",
              "other",
            ],
          },
          captured_at: iso8601,
          expires_at: iso8601,
          confidence: { type: "number", minimum: 0, maximum: 1 },
          payload: { type: "object" },
        },
      }
    )
  )
);

written.push(
  write(
    "ai-answer-trace.v1.json",
    meta(
      "ai-answer-trace.v1.json",
      "AiAnswerTraceV1",
      "Engine §47.5 explainability · lane P|G|S. NEVER: mutation tools · G-lane money tools.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "intent",
          "lane",
          "facts_used",
          "tools_called",
          "provider_id",
          "answer_path",
          "guard_result",
        ],
        properties: {
          intent: { type: "string" },
          lane: { type: "string", enum: ["P", "G", "S"] },
          twin_snapshot_id: uuidLike,
          memory_ids: { type: "array", items: { type: "string" } },
          facts_used: {
            type: "array",
            items: { $ref: ID("fact-card.v1.json") },
          },
          tools_called: {
            type: "array",
            items: { type: "string" },
            description: "P lane only",
          },
          provider_id: {
            type: "string",
            enum: ["ollama", "groq", "gemini_free", "openai", "none"],
          },
          answer_path: {
            type: "string",
            enum: [
              "template",
              "fact",
              "rag",
              "llm_p",
              "llm_g",
              "refuse_s",
            ],
          },
          guard_result: {
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: {
              status: {
                type: "string",
                enum: ["pass", "refresh", "block", "reroute_p"],
              },
              reason: { type: "string" },
            },
          },
          createdAt: iso8601,
        },
      }
    )
  )
);

written.push(
  write(
    "user-profile.v1.json",
    meta(
      "user-profile.v1.json",
      "UserProfileV1",
      "Infra §51.9.1 Stage A/B. NEVER: RRN · gender · Day-1 required address.",
      {
        type: "object",
        additionalProperties: false,
        required: ["userId", "termsAcceptedAt", "privacyAcceptedAt"],
        properties: {
          userId: uuidLike,
          termsAcceptedAt: iso8601,
          privacyAcceptedAt: iso8601,
          marketingConsent: { type: "boolean" },
          referralCode: { type: "string" },
          displayName: { type: "string", minLength: 2, maxLength: 40 },
          phoneE164: { type: "string", pattern: "^\\+[1-9][0-9]{7,14}$" },
          email: { type: "string", format: "email" },
          birthDate: {
            type: "string",
            format: "date",
            description: "Age 19+ · no gender field",
          },
          onboardingStage: {
            type: "string",
            enum: ["A", "B_incomplete", "B_complete"],
          },
          createdAt: iso8601,
          updatedAt: iso8601,
        },
        not: {
          anyOf: [
            { required: ["rrnFull"] },
            { required: ["gender"] },
            { required: ["addressRequired"] },
          ],
        },
      }
    )
  )
);

written.push(
  write(
    "auth-session.v1.json",
    meta(
      "auth-session.v1.json",
      "AuthSessionV1",
      "Infra §51.9 Nest JWT session only · Supabase Auth FORBIDDEN.",
      {
        type: "object",
        additionalProperties: false,
        required: [
          "sessionId",
          "userId",
          "issuer",
          "issuedAt",
          "expiresAt",
          "revoked",
        ],
        properties: {
          sessionId: uuidLike,
          userId: uuidLike,
          issuer: {
            type: "string",
            const: "ai-profit-os-nest",
            description: "Nest JWT issuer · not Supabase Auth",
          },
          deviceId: { type: "string" },
          deviceLabel: { type: "string" },
          ip: { type: "string" },
          issuedAt: iso8601,
          expiresAt: iso8601,
          revoked: { type: "boolean" },
          revokedAt: iso8601,
          refreshJti: { type: "string" },
        },
      }
    )
  )
);

// Manifest for Day-1 inventory
written.push(
  write("manifest.day1.json", {
    $schema: DRAFT,
    $id: ID("manifest.day1.json"),
    title: "SchemasDay1Manifest",
    description:
      "Day-1 contract inventory for todo schemas-contracts-core · BOOTSTRAP §3.1 + auth/kyc + legal.",
    version: 1,
    files: written.filter((f) => f !== "manifest.day1.json"),
    owns: "ACTIVE Index schemas-contracts-core",
    neverEditPlan: true,
  })
);

console.log(`Wrote ${written.length} files → ${OUT}`);
written.forEach((f) => console.log(" -", f));
