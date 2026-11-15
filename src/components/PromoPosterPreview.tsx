import React from "react";
import { Calendar, CreditCard, Loader2 } from "lucide-react";
import type { PosterConfig } from "../types/showcard";

interface PromoPosterPreviewProps {
  config: PosterConfig;
  isAnalyzing: boolean;
}

const TEMPLATE_ASSETS = {
  "cu-top": "/assets/aistudio/IMG_4822_5a206e27.png",
  "cu-bottom": "/assets/aistudio/IMG_4823_762224f2.png",
} as const;

export function PromoPosterPreview({
  config,
  isAnalyzing,
}: PromoPosterPreviewProps) {
  const isTopTemplate = config.theme === "cu-top";
  const templateSrc = TEMPLATE_ASSETS[config.theme];

  const hasEventType = config.eventType.trim().length > 0;
  const hasProductName = config.productName.trim().length > 0;
  const hasSubInfo = config.subInfo.trim().length > 0;
  const hasPrice = config.price.trim().length > 0;
  const hasPriceNote = config.priceNote.trim().length > 0;
  const hasCardDiscount = config.cardDiscount.trim().length > 0;
  const hasPeriod = config.period.trim().length > 0;
  const showImage = Boolean(config.productImageUrl && config.showProductImage);

  return (
    <div className="relative w-full max-w-[440px] mx-auto">
      <div
        id="promo-poster"
        className={`relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-white border border-slate-200/80 font-poster select-none flex flex-col justify-between px-6 sm:px-7 ${
          isTopTemplate ? "pt-[21%] pb-5" : "pt-5 pb-[26%]"
        }`}
      >
        {/* 배경 CU 템플릿 이미지 */}
        <img
          src={templateSrc}
          alt={
            isTopTemplate
              ? "CU 상단 캐릭터 홍보물 배경"
              : "CU 하단 매장 홍보물 배경"
          }
          className={`pointer-events-none absolute left-[-0.5%] w-[101%] max-w-none h-auto z-0 ${
            isTopTemplate ? "top-[-0.5%]" : "bottom-[-0.5%]"
          }`}
        />

        {/* 중앙 메인 콘텐츠 영역 */}
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          {/* 행사 유형 배지 */}
          {hasEventType && (
            <div className="mb-2.5 inline-flex items-center justify-center px-5 py-1 rounded-full bg-[#652D90] text-white text-base sm:text-lg font-black tracking-tight shadow-[0_6px_16px_rgba(101,45,144,0.28)] border-2 border-[#A5CF4C]">
              {config.eventType}
            </div>
          )}

          {/* 상품 이미지 (선택) */}
          {showImage && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1.5 mb-2.5 bg-white border border-purple-200 shadow-sm flex items-center justify-center overflow-hidden">
              <img
                src={config.productImageUrl ?? ""}
                alt={config.productName || "행사 상품"}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}

          {/* 상품명 */}
          <h3
            style={{ fontSize: `${config.productFontSize}px` }}
            className="font-black leading-[1.16] tracking-tight break-keep text-balance text-slate-900"
          >
            {hasProductName ? config.productName : "상품명을 입력해 주세요"}
          </h3>

          {/* 서브 정보 */}
          {hasSubInfo && (
            <p className="mt-2 text-sm sm:text-[15px] font-semibold leading-snug break-keep max-w-[92%] text-slate-600">
              {config.subInfo}
            </p>
          )}

          {/* 가격 영역 */}
          <div className="mt-3.5 flex flex-col items-center">
            <span className="text-[11px] font-extrabold tracking-wider text-[#652D90] mb-0.5">
              행사 판매가
            </span>
            <div className="text-4xl sm:text-[44px] font-black tracking-tight leading-none font-mono-num text-[#E11D48]">
              {hasPrice ? config.price : "0원"}
            </div>
            {hasPriceNote && (
              <div className="mt-2 px-3 py-1 rounded-lg text-xs font-extrabold tracking-tight bg-[#F3EBF9] border border-[#D8BFE8] text-[#56227D]">
                {config.priceNote}
              </div>
            )}
          </div>
        </div>

        {/* 하단 강조 박스: 카드 즉시할인 & 행사 기간 */}
        <div className="relative z-10 mt-3">
          {hasCardDiscount || hasPeriod ? (
            <div className="rounded-xl p-3 sm:p-3.5 bg-[#5E258A] text-white shadow-md border border-[#A5CF4C]/60">
              {hasCardDiscount && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#A5CF4C] text-[#3B1259]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold tracking-tight text-[#D7F57A]">
                      추가 결제 혜택
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold leading-snug break-keep text-white">
                      {config.cardDiscount}
                    </div>
                  </div>
                </div>
              )}

              {hasCardDiscount && hasPeriod && (
                <div className="my-2 border-t border-white/15" />
              )}

              {hasPeriod && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-100">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-[#D7F57A]" />
                  <span>행사 기간: {config.period}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-2" />
          )}
        </div>

        {/* AI 분석 중 오버레이 */}
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
