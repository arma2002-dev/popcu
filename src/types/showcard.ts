export type PosterThemeId = "regular" | "liquor" | "hotdeal";

export interface ShowCardData {
  eventType: string;
  productName: string;
  subInfo: string;
  price: string;
  cardDiscount: string;
  period: string;
}

export interface PosterConfig extends ShowCardData {
  storeName: string;
  productFontSize: number;
  theme: PosterThemeId;
}

export interface SamplePreset {
  id: string;
  label: string;
  theme: PosterThemeId;
  storeName: string;
  productFontSize: number;
  data: ShowCardData;
}
