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
      "허가 업종: 시계·명품 중고 매매, 트레이딩 카드·수집품 거래, 해외 시세 비교·국제 중개, 온라인 전자상거래·앱 운영, AI 시세 기회 안내·거래 지원",
  },
  license: {
    pageTitle: "상업 면허",
    pageSubtitle: "운영 주체 등록 정보",
    disclaimer:
      "아래 내용은 등록된 사업자 정보 요약입니다. 공식 면허증은 두바이 경제관광부(DET)에서 발급한 원본 PDF로 확인해 주세요.",
    fields: {
      legalName: "법인명",
      legalForm: "법인 형태",
      licenseNumber: "면허 번호",
      issuingAuthority: "발급 기관",
      jurisdiction: "관할",
      licenseStatus: "면허 상태",
      primaryActivity: "주요 업종",
      tradingBrand: "트레이딩 브랜드",
      relatedWebsite: "관련 웹사이트",
      addresses: "등록 주소",
      licensedActivities: "허가 업종",
      verification: "공식 확인",
    },
    statusActive: "유효",
    statusPending: "확인 중",
    printHint: "인쇄용 면허 요약서",
    printLink: "면허 요약서 열기",
    verifyDet: "DET에서 면허 확인하기",
    backToLegal: "약관으로 돌아가기",
  },
} as const;

export type OperatorCopy = typeof operator;
