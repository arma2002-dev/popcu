import React from "react";
import {
  Calendar,
  CreditCard,
  Flame,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Type as TypeIcon,
  Wine,
} from "lucide-react";
import type { PosterConfig, PosterThemeId } from "../types/showcard";

interface PosterEditorPanelProps {
  config: PosterConfig;
  isAnalyzing: boolean;
  onChange: <K extends keyof PosterConfig>(key: K, value: PosterConfig[K]) => void;
}

const THEME_OPTIONS: Array<{
  id: PosterThemeId;
  label: string;
  subtitle: string;
  swatchClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "regular",
    label: "정기 홍보물",
    subtitle: "퍼플 · 민트",
    swatchClass: "bg-gradient-to-br from-purple-700 via-indigo-800 to-purple-900",
    icon: Sparkles,
  },
  {
    id: "liquor",
    label: "주류/야간 특가",
    subtitle: "다크 · 골드",
    swatchClass: "bg-gradient-to-br from-zinc-900 via-neutral-900 to-amber-950",
    icon: Wine,
  },
  {
    id: "hotdeal",
    label: "초특가/핫딜",
    subtitle: "레드 · 옐로우",
    swatchClass: "bg-gradient-to-br from-red-600 via-rose-700 to-red-900",
    icon: Flame,
  },
];

export function PosterEditorPanel({
  config,
  isAnalyzing,
  onChange,
}: PosterEditorPanelProps) {
  return (
    <div className="space-y-5">
      {/* 테마 선택 */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="mb-3.5">
          <h2 className="text-base font-bold text-slate-900">
            2. 포스터 디자인 테마
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            상품 성격에 맞는 홍보물 분위기를 선택하세요
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {THEME_OPTIONS.map((theme) => {
            const Icon = theme.icon;
            const isActive = config.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChange("theme", theme.id)}
                className={`group text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`w-7 h-7 rounded-lg ${theme.swatchClass} flex items-center justify-center text-white shrink-0`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  {isActive && (
                    <span className="text-[11px] font-bold text-slate-900 whitespace-nowrap">
                      선택됨
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {theme.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {theme.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 텍스트 실시간 편집 */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              3. 문구 및 스타일 편집
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              입력한 내용이 오른쪽 포스터에 실시간으로 반영됩니다
            </p>
          </div>
        </div>

        <div className={`space-y-4 ${isAnalyzing ? "opacity-60 pointer-events-none" : ""}`}>
          {/* 지점명 + 행사 유형 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="input-store-name"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
              >
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>지점명 (선택)</span>
              </label>
              <input
                id="input-store-name"
                type="text"
                value={config.storeName}
                onChange={(e) => onChange("storeName", e.target.value)}
                placeholder="예: CU 진해점"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="input-event-type"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>행사 유형</span>
              </label>
              <input
                id="input-event-type"
                type="text"
                value={config.eventType}
                onChange={(e) => onChange("eventType", e.target.value)}
                placeholder="예: 1+1, 2+1, 초특가 할인"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>
          </div>

          {/* 상품명 + 글자 크기 슬라이더 */}
          <div>
            <label
              htmlFor="input-product-name"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>상품명</span>
            </label>
            <input
              id="input-product-name"
              type="text"
              value={config.productName}
              onChange={(e) => onChange("productName", e.target.value)}
              placeholder="예: 연세우유 생크림빵 시리즈"
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />

            {/* 글자 크기 슬라이더 */}
            <div className="mt-2.5 px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="slider-font-size"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>상품명 글자 크기</span>
                </label>
                <span className="font-mono-num text-xs font-bold text-slate-900">
                  {config.productFontSize}px
                </span>
              </div>
              <input
                id="slider-font-size"
                type="range"
                min={20}
                max={56}
                step={1}
                value={config.productFontSize}
                onChange={(e) =>
                  onChange("productFontSize", Number(e.target.value))
                }
                className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono-num mt-1">
                <span>20px</span>
                <span>38px</span>
                <span>56px</span>
              </div>
            </div>
          </div>

          {/* 용량 / 규격 / 서브 카피 */}
          <div>
            <label
              htmlFor="input-sub-info"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              용량 · 규격 · 서브 카피
            </label>
            <input
              id="input-sub-info"
              type="text"
              value={config.subInfo}
              onChange={(e) => onChange("subInfo", e.target.value)}
              placeholder="예: 500ml 캔 · 교차 구매 가능"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>

          {/* 최종 판매가 */}
          <div>
            <label
              htmlFor="input-price"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              최종 판매가 / 행사가
            </label>
            <input
              id="input-price"
              type="text"
              value={config.price}
              onChange={(e) => onChange("price", e.target.value)}
              placeholder="예: 2,900원"
              className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>

          {/* 카드 즉시할인 조건 */}
          <div>
            <label
              htmlFor="input-card-discount"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>카드 즉시할인 조건</span>
            </label>
            <input
              id="input-card-discount"
              type="text"
              value={config.cardDiscount}
              onChange={(e) => onChange("cardDiscount", e.target.value)}
              placeholder="예: 삼성카드 결제 시 20% 현장할인"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>

          {/* 행사 기간 */}
          <div>
            <label
              htmlFor="input-period"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>행사 기간</span>
            </label>
            <input
              id="input-period"
              type="text"
              value={config.period}
              onChange={(e) => onChange("period", e.target.value)}
              placeholder="예: 11월 1일 ~ 11월 30일"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
