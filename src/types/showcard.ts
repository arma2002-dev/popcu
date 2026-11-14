export type PosterThemeId = "regular" | "liquor" | "hotdeal";

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
  storeName: string;
  productFontSize: number;
  theme: PosterThemeId;
  productImageUrl: string | null;
  showProductImage: boolean;
}

export interface SamplePreset {
  id: string;
  label: string;
  theme: PosterThemeId;
  storeName: string;
  productFontSize: number;
  data: Omit<ShowCardData, "productImageBox">;
}
