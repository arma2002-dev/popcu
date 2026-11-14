import type { PosterConfig, SamplePreset } from "../types/showcard";

export const DEFAULT_POSTER_CONFIG: PosterConfig = {
  storeName: "CU 진해점",
  eventType: "1+1",
  productName: "연세우유 생크림빵 시리즈",
  subInfo: "우유 / 초코 / 말차 교차구매 가능 · 130g",
  price: "2,900원",
  cardDiscount: "카카오페이머니 결제 시 20% 즉시할인",
  period: "11월 1일 ~ 11월 30일",
  productFontSize: 40,
  theme: "regular",
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "regular-bakery",
    label: "1+1 정기 행사 샘플",
    theme: "regular",
    storeName: "CU 진해점",
    productFontSize: 40,
    data: {
      eventType: "1+1",
      productName: "연세우유 생크림빵 시리즈",
      subInfo: "우유 / 초코 / 말차 교차구매 가능 · 130g",
      price: "2,900원",
      cardDiscount: "카카오페이머니 결제 시 20% 즉시할인",
      period: "11월 1일 ~ 11월 30일",
    },
  },
  {
    id: "liquor-night",
    label: "주류/야간 특가 샘플",
    theme: "liquor",
    storeName: "CU 진해점",
    productFontSize: 38,
    data: {
      eventType: "야간 특가",
      productName: "아사히 수퍼드라이 생맥주 캔",
      subInfo: "340ml 4캔 번들 · 거품이 풍성한 풀오픈탭",
      price: "11,000원",
      cardDiscount: "삼성카드 결제 시 20% 현장할인 (최종 8,800원)",
      period: "11월 매주 금·토·일 18:00 ~ 02:00",
    },
  },
  {
    id: "hotdeal-snack",
    label: "초특가/핫딜 샘플",
    theme: "hotdeal",
    storeName: "CU 진해점",
    productFontSize: 38,
    data: {
      eventType: "초특가 할인",
      productName: "백종원 고기듬뿍 제육 도시락",
      subInfo: "한정 수량 · 1,000원 즉시 할인 행사",
      price: "3,900원",
      cardDiscount: "네이버페이 결제 시 30% 추가 적립",
      period: "11월 14일 ~ 11월 20일 (7일간)",
    },
  },
];
