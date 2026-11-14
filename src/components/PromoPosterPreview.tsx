import React from "react";
import { Calendar, CreditCard, Loader2, Sparkles, Store } from "lucide-react";
import type { PosterConfig, PosterThemeId } from "../types/showcard";

interface PromoPosterPreviewProps {
  config: PosterConfig;
  isAnalyzing: boolean;
}

interface ThemeVisualStyle {
  containerBg: string;
  innerBorder: string;
  topGlow: string;
  bottomGlow: string;
  storeBadge: string;
  kickerText: string;
  eventBadge: string;
  productTitle: string;
  subInfoText: string;
  priceLabel: string;
  priceValue: string;
  priceDivider: string;
  footerCard: string;
  footerCardIconWrap: string;
  footerCardDiscountTitle: string;
  footerCardDiscountText: string;
  footerCardPeriod: string;
  footerDivider: string;
}

const THEME_STYLES: Record<PosterThemeId, ThemeVisualStyle> = {
  regular: {
    containerBg: "bg-gradient-to-br from-purple-700 via-indigo-800 to-purple-900",
    innerBorder: "border border-emerald-300/30",
    topGlow: "bg-emerald-400/20",
    bottomGlow: "bg-purple-400/25",
    storeBadge: "bg-white/15 border border-white/25 text-white",
    kickerText: "text-emerald-300",
    eventBadge:
      "bg-emerald-400 text-purple-950 shadow-[0_8px_24px_rgba(16,185,129,0.35)]",
    productTitle: "text-white",
    subInfoText: "text-purple-100/90",
    priceLabel: "text-emerald-300",
    priceValue: "text-white",
    priceDivider: "bg-emerald-300/40",
    footerCard: "bg-white text-slate-900 shadow-lg",
    footerCardIconWrap: "bg-purple-100 text-purple-800",
    footerCardDiscountTitle: "text-purple-700",
    footerCardDiscountText: "text-slate-900",
    footerCardPeriod: "text-slate-600",
    footerDivider: "border-slate-200",
  },
  liquor: {
    containerBg: "bg-gradient-to-br from-zinc-900 via-neutral-900 to-amber-950",
    innerBorder: "border border-amber-400/35",
    topGlow: "bg-amber-400/15",
    bottomGlow: "bg-amber-600/20",
    storeBadge: "bg-amber-400/15 border border-amber-300/35 text-amber-200",
    kickerText: "text-amber-300",
    eventBadge:
      "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-zinc-950 shadow-[0_8px_24px_rgba(245,158,11,0.3)]",
    productTitle: "text-amber-50",
    subInfoText: "text-zinc-300",
    priceLabel: "text-amber-400",
    priceValue: "text-amber-300",
    priceDivider: "bg-amber-400/45",
    footerCard: "bg-zinc-950/85 border border-amber-400/45 text-amber-50 shadow-lg",
    footerCardIconWrap: "bg-amber-400/20 text-amber-300",
    footerCardDiscountTitle: "text-amber-300",
    footerCardDiscountText: "text-white",
    footerCardPeriod: "text-zinc-300",
    footerDivider: "border-amber-400/20",
  },
  hotdeal: {
    containerBg: "bg-gradient-to-br from-red-600 via-rose-700 to-red-900",
    innerBorder: "border border-yellow-300/40",
    topGlow: "bg-yellow-300/20",
    bottomGlow: "bg-orange-400/25",
    storeBadge: "bg-red-950/45 border border-yellow-300/40 text-yellow-200",
    kickerText: "text-yellow-300",
    eventBadge:
      "bg-yellow-300 text-red-950 shadow-[0_8px_24px_rgba(253,224,71,0.35)]",
    productTitle: "text-white",
    subInfoText: "text-rose-100",
    priceLabel: "text-yellow-300",
    priceValue: "text-yellow-300",
    priceDivider: "bg-yellow-300/50",
    footerCard: "bg-yellow-300 text-red-950 shadow-lg",
    footerCardIconWrap: "bg-red-700 text-yellow-300",
    footerCardDiscountTitle: "text-red-800",
    footerCardDiscountText: "text-red-950",
    footerCardPeriod: "text-red-900",
    footerDivider: "border-red-950/15",
  },
};

export function PromoPosterPreview({
  config,
  isAnalyzing,
}: PromoPosterPreviewProps) {
  const style = THEME_STYLES[config.theme];
  const hasStoreName = config.storeName.trim().length > 0;
  const hasEventType = config.eventType.trim().length > 0;
  const hasProductName = config.productName.trim().length > 0;
  const hasSubInfo = config.subInfo.trim().length > 0;
  const hasPrice = config.price.trim().length > 0;
  const hasCardDiscount = config.cardDiscount.trim().length > 0;
  const hasPeriod = config.period.trim().length > 0;

  return (
    <div className="relative w-full max-w-[440px] mx-auto">
      <div
        id="promo-poster"
        className={`relative w-full aspect-[4/5] overflow-hidden rounded-2xl ${style.containerBg} font-poster select-none flex flex-col justify-between p-6 sm:p-7`}
      >
        {/* 배경 빛 번짐 장식 */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full blur-3xl ${style.topGlow}`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full blur-3xl ${style.bottomGlow}`}
        />

        {/* 내부 포스터 프레임 */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-3 rounded-xl ${style.innerBorder}`}
        />

        {/* 상단 헤더: 지점명 & 행사 배지 */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {hasStoreName ? (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight ${style.storeBadge}`}
              >
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{config.storeName}</span>
              </div>
            ) : (
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest uppercase ${style.kickerText}`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>STORE EVENT</span>
              </div>
            )}
          </div>

          {hasEventType && (
            <div
              className={`px-4 py-1.5 rounded-xl text-base sm:text-lg font-black tracking-tight whitespace-nowrap shrink-0 -rotate-2 ${style.eventBadge}`}
            >
              {config.eventType}
            </div>
          )}
        </div>

        {/* 중앙 메인: 상품명, 서브 정보, 행사가 */}
        <div className="relative z-10 my-auto py-4 text-center flex flex-col items-center">
          <div
            className={`text-[11px] font-extrabold tracking-[0.18em] uppercase mb-2.5 ${style.kickerText}`}
          >
            {config.theme === "liquor"
              ? "NIGHT SPECIAL SELECTION"
              : config.theme === "hotdeal"
                ? "LIMITED HOT DEAL"
                : "SPECIAL PROMOTION"}
          </div>

          <h3
            style={{ fontSize: `${config.productFontSize}px` }}
            className={`font-black leading-[1.18] tracking-tight break-keep text-balance ${style.productTitle}`}
          >
            {hasProductName ? config.productName : "상품명을 입력해 주세요"}
          </h3>

          {hasSubInfo && (
            <p
              className={`mt-3 text-sm sm:text-[15px] font-medium leading-snug break-keep max-w-[90%] ${style.subInfoText}`}
            >
              {config.subInfo}
            </p>
          )}

          {/* 가격 영역 */}
          <div className="mt-5 flex flex-col items-center">
            <div className={`w-10 h-0.5 rounded-full mb-3 ${style.priceDivider}`} />
            <span
              className={`text-[11px] font-bold tracking-wider uppercase mb-1 ${style.priceLabel}`}
            >
              행사 판매가
            </span>
            <div
              className={`text-4xl sm:text-[44px] font-black tracking-tight leading-none font-mono-num ${style.priceValue}`}
            >
              {hasPrice ? config.price : "0원"}
            </div>
          </div>
        </div>

        {/* 하단 강조 박스: 카드 즉시할인 & 행사 기간 */}
        <div className="relative z-10">
          {hasCardDiscount || hasPeriod ? (
            <div className={`rounded-xl p-3.5 sm:p-4 ${style.footerCard}`}>
              {hasCardDiscount && (
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.footerCardIconWrap}`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[11px] font-extrabold tracking-tight ${style.footerCardDiscountTitle}`}
                    >
                      추가 결제 혜택
                    </div>
                    <div
                      className={`text-sm font-extrabold leading-snug break-keep ${style.footerCardDiscountText}`}
                    >
                      {config.cardDiscount}
                    </div>
                  </div>
                </div>
              )}

              {hasCardDiscount && hasPeriod && (
                <div className={`my-2.5 border-t ${style.footerDivider}`} />
              )}

              {hasPeriod && (
                <div
                  className={`flex items-center justify-center gap-1.5 text-xs font-bold ${style.footerCardPeriod}`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>행사 기간: {config.period}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>

        {/* AI 분석 중 오버레이 (PNG 저장 요소 내부지만 분석 중일 때만 표시) */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-400 mb-3" />
            <p className="text-base font-bold">쇼카드 정보 분석 중</p>
            <p className="text-xs text-slate-300 mt-1">
              잠시만 기다려 주시면 포스터가 자동으로 완성됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
