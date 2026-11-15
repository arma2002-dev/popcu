export type PosterThemeId = "cu-top" | "cu-bottom";

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

export interface SamplePreset {
  id: string;
  label: string;
  theme: PosterThemeId;
  productFontSize: number;
  data: Omit<ShowCardData, "productImageBox">;
}
