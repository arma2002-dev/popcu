import React from "react";
import {
  BookmarkPlus,
  Check,
  Clock,
  FolderOpen,
  History,
  Loader2,
  LogIn,
  Trash2,
} from "lucide-react";
import type { PosterHistoryItem } from "../types/showcard";

interface PosterHistoryPanelProps {
  isAuthenticated: boolean;
  isLoadingHistory: boolean;
  isSavingHistory: boolean;
  isAuthBusy?: boolean;
  authErrorMessage?: string | null;
  items: PosterHistoryItem[];
  activePosterId: string;
  onSignIn: () => void;
  onSaveCurrentAsNew: () => void;
  onSelectPoster: (item: PosterHistoryItem) => void;
  onDeletePoster: (posterId: string) => void;
}

function formatKoreanTime(ms: number): string {
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  const d = new Date(ms);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${month}.${day} ${hh}:${mm}`;
}

export function PosterHistoryPanel({
  isAuthenticated,
  isLoadingHistory,
  isSavingHistory,
  isAuthBusy = false,
  authErrorMessage,
  items,
  activePosterId,
  onSignIn,
  onSaveCurrentAsNew,
  onSelectPoster,
  onDeletePoster,
}: PosterHistoryPanelProps) {
  return (
    <section
      id="poster-history-section"
      className="bg-white border border-slate-200 rounded-2xl p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              4. 작업한 홍보물 히스토리
            </h2>
            {isAuthenticated && (
              <span className="font-mono-num text-xs font-bold text-purple-700">
                {items.length}건
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            저장된 홍보물을 클릭하면 스마트폰과 컴퓨터 모두에 즉시 불러옵니다
          </p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={onSaveCurrentAsNew}
            disabled={isSavingHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSavingHistory ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5" />
            )}
            <span>새 히스토리로 저장</span>
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="border border-dashed border-slate-300 bg-slate-50/70 rounded-xl p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-purple-700 flex items-center justify-center mx-auto mb-2.5">
            <History className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            로그인하면 작업 내역이 모든 기기에 자동 저장됩니다
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            스마트폰에서 만든 쇼카드 포스터를 컴퓨터에서 그대로 이어서 편집하고
            저장해 둘 수 있습니다.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onSignIn}
              disabled={isAuthBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {isAuthBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>Google 로그인으로 동기화</span>
            </button>
          </div>
          {authErrorMessage && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 leading-relaxed">
              {authErrorMessage}
            </p>
          )}
        </div>
      ) : isLoadingHistory ? (
        <div className="space-y-2.5">
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="h-16 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-slate-200/80 bg-slate-50 rounded-xl p-5 text-center">
          <p className="text-xs font-semibold text-slate-700">
            아직 저장된 홍보물 히스토리가 없습니다
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            쇼카드 사진을 AI로 분석하거나 상단의 &apos;새 히스토리로 저장&apos;을
            누르면 자동으로 기록됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5">
          {items.map((item) => {
            const isActive = item.id === activePosterId;
            const themeLabel =
              item.theme === "cu-bottom" ? "하단 매장형" : "상단 캐릭터형";
            const sourceLabel =
              item.source === "ai-scan"
                ? "AI 분석"
                : item.source === "sample"
                ? "샘플"
                : "직접 편집";

            return (
              <div
                key={item.id}
                className={`group rounded-xl border p-3 transition-colors flex items-center gap-3 ${
                  isActive
                    ? "border-purple-600 bg-purple-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPoster(item)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="w-12 h-14 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {item.productImageUrl && item.showProductImage ? (
                      <img
                        src={item.productImageUrl}
                        alt={item.productName || "상품"}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <img
                        src={
                          item.theme === "cu-bottom"
                            ? "/assets/aistudio/IMG_4823_762224f2.png"
                            : "/assets/aistudio/IMG_4822_5a206e27.png"
                        }
                        alt={themeLabel}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.eventType && (
                        <span className="text-[11px] font-extrabold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                          {item.eventType}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.productName || "제목 없는 홍보물"}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="w-3 h-3" />
                          <span>편집 중</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-mono-num font-bold text-rose-600">
                        {item.price || "-"}
                      </span>
                      <span>·</span>
                      <span>{themeLabel}</span>
                      <span>·</span>
                      <span>{sourceLabel}</span>
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatKoreanTime(item.updatedAtMs)}</span>
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectPoster(item)}
                    title="불러오기"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">불러오기</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePoster(item.id)}
                    title="히스토리 삭제"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
