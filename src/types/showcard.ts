export type PosterThemeId = "cu-top" | "cu-bottom";

export type PosterHistorySource = "ai-scan" | "manual" | "sample";

export interface ShowCardData {
  eventType: string;
  productName: string;
  subInfo: string;
  price: string;
  priceNote: string;
  cardDiscount: string;
  period: string;
  productImageBox?: number[];
}

export interface PosterConfig extends Omit<ShowCardData, "productImageBox"> {
  productFontSize: number;
  theme: PosterThemeId;
  productImageUrl: string | null;
  showProductImage: boolean;
}

export interface PosterHistoryItem extends PosterConfig {
  id: string;
  source: PosterHistorySource;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SamplePreset {
  id: string;
  label: string;
  theme: PosterThemeId;
  productFontSize: number;
  data: Omit<ShowCardData, "productImageBox">;
}
