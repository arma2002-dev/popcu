import type { PosterConfig, SamplePreset } from "../types/showcard";

export const DEFAULT_POSTER_CONFIG: PosterConfig = {
  eventType: "1+1",
  productName: "라엘 순면커버 중형 16P",
  subInfo: "중형 16개입 · CU 키핑 가능",
  price: "11,900원",
  priceNote: "1+1 적용 시 개당 5,950원",
  cardDiscount: "CU Npay 추가할인 (포켓CU 확인)",
  period: "11.1 ~ 11.30",
  productFontSize: 38,
  theme: "regular",
  productImageUrl: null,
  showProductImage: true,
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "regular-rael",
    label: "1+1 CU 쇼카드 예시",
    theme: "regular",
    productFontSize: 38,
    data: {
      eventType: "1+1",
      productName: "라엘 순면커버 중형 16P",
      subInfo: "중형 16개입 · CU 키핑 가능",
      price: "11,900원",
      priceNote: "1+1 적용 시 개당 5,950원",
      cardDiscount: "CU Npay 추가할인 (포켓CU 확인)",
      period: "11.1 ~ 11.30",
    },
  },
  {
    id: "regular-bakery",
    label: "1+1 디저트 행사 샘플",
    theme: "regular",
    productFontSize: 40,
    data: {
      eventType: "1+1",
      productName: "연세우유 생크림빵 시리즈",
      subInfo: "우유 / 초코 / 말차 교차구매 가능 · 130g",
      price: "2,900원",
      priceNote: "1+1 적용 시 개당 1,450원",
      cardDiscount: "카카오페이머니 결제 시 20% 즉시할인",
      period: "11월 1일 ~ 11월 30일",
    },
  },
  {
    id: "liquor-night",
    label: "주류/야간 특가 샘플",
    theme: "liquor",
    productFontSize: 38,
    data: {
      eventType: "야간 특가",
      productName: "아사히 수퍼드라이 생맥주 캔",
      subInfo: "340ml 4캔 번들 · 거품이 풍성한 풀오픈탭",
      price: "11,000원",
      priceNote: "4캔 묶음 행사가",
      cardDiscount: "삼성카드 결제 시 20% 현장할인 (최종 8,800원)",
      period: "11월 매주 금·토·일 18:00 ~ 02:00",
    },
  },
  {
    id: "hotdeal-snack",
    label: "초특가/핫딜 샘플",
    theme: "hotdeal",
    productFontSize: 38,
    data: {
      eventType: "초특가 할인",
      productName: "백종원 고기듬뿍 제육 도시락",
      subInfo: "한정 수량 · 1,000원 즉시 할인 행사",
      price: "3,900원",
      priceNote: "정상가 4,900원 → 20% 할인",
      cardDiscount: "네이버페이 결제 시 30% 추가 적립",
      period: "11월 14일 ~ 11월 20일 (7일간)",
    },
  },
];
