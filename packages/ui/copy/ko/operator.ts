/**
 * T.operator.* · T.legal.operator.* — UI §50.9 DET 푸터 · 면허 정보
 * SSOT: schemas/operator-entity.v1.json · instance: operator-entity.instance.json
 */
export const operator = {
  footer: {
    line: "두바이 경제관광부(DET) 면허 | 사업자등록번호 1135431 | PRE-OWNED WATCHES L.L.C",
    detLinkLabel: "두바이 경제관광부",
  },
  legal: {
    sectionTitle: "운영 주체",
    body: "본 서비스는 PRE-OWNED WATCHES L.L.C(두바이, UAE)가 운영합니다.",
    licenseLine: "두바이 경제관광부(DET) 상업 면허 번호 1135431",
    activityLine:
      "주요 업종(제공 정보 기준): 시계 및 예비 부품 소매업 · 전체 등록 업종은 DET 원본 확인이 필요합니다.",
  },
  license: {
    pageTitle: "사업자 정보",
    pageSubtitle: "운영 주체와 DET 면허 번호 정보",
    disclaimer:
      "아래 내용은 운영사가 제공한 사업자 정보 요약입니다. DET 원본 면허증 또는 공식 조회 결과가 확인되기 전에는 현재 상태와 전체 등록 업종을 확정 정보로 표시하지 않습니다.",
    fields: {
      legalName: "법인명",
      legalForm: "법인 형태",
      licenseNumber: "면허 번호",
      issuingAuthority: "발급 기관",
      jurisdiction: "관할",
      licenseStatus: "공식 상태 확인",
      primaryActivity: "주요 업종(제공 정보)",
      tradingBrand: "트레이딩 브랜드",
      relatedWebsite: "관련 웹사이트",
      addresses: "등록 주소",
      licensedActivities: "등록 업종 확인",
      verification: "공식 확인",
    },
    statusActive: "DET 확인됨",
    statusPending: "DET 확인 필요",
    primaryActivityNote: "전체 등록 업종은 DET 원본 확인이 필요합니다.",
    printHint: "인쇄용 사업자 정보 요약",
    printLink: "사업자 정보 요약 열기",
    verifyDet: "DET에서 면허 확인하기",
    backToLegal: "약관으로 돌아가기",
  },
} as const;

export type OperatorCopy = typeof operator;
