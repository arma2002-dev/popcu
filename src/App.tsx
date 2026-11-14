import React, { useState } from "react";
import { toPng } from "html-to-image";
import {
  Check,
  Download,
  Loader2,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { PosterEditorPanel } from "./components/PosterEditorPanel";
import { PromoPosterPreview } from "./components/PromoPosterPreview";
import { ShowCardUploader } from "./components/ShowCardUploader";
import { DEFAULT_POSTER_CONFIG, SAMPLE_PRESETS } from "./constants/samples";
import type { PosterConfig, ShowCardData } from "./types/showcard";

async function cropProductImageFromShowcard(
  imageDataUrl: string,
  box: number[]
): Promise<string | null> {
  if (box.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = box;
  if (ymax <= ymin || xmax <= xmin) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const sx = Math.max(0, Math.floor((xmin / 1000) * img.width));
      const sy = Math.max(0, Math.floor((ymin / 1000) * img.height));
      const sw = Math.min(
        img.width - sx,
        Math.ceil(((xmax - xmin) / 1000) * img.width)
      );
      const sh = Math.min(
        img.height - sy,
        Math.ceil(((ymax - ymin) / 1000) * img.height)
      );

      if (sw < 20 || sh < 20) {
        resolve(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = imageDataUrl;
  });
}

export default function App() {
  const [config, setConfig] = useState<PosterConfig>(DEFAULT_POSTER_CONFIG);
  const [sampleIndex, setSampleIndex] = useState<number>(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleFieldChange = <K extends keyof PosterConfig>(
    key: K,
    value: PosterConfig[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleImageSelected = async (
    imageBase64: string,
    mimeType: string,
    previewDataUrl: string
  ) => {
    setPreviewUrl(previewDataUrl);
    setErrorMessage(null);
    setAnalysisSuccess(false);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-showcard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      });

      const rawText = await response.text();
      let payload: { data?: ShowCardData; error?: string } | null = null;
      try {
        payload = rawText
          ? (JSON.parse(rawText) as { data?: ShowCardData; error?: string })
          : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.data) {
        if (response.status === 404) {
          throw new Error(
            "이미지 분석 서버 경로(/api/analyze-showcard)를 찾을 수 없습니다. 페이지를 새로고침하거나 개발 서버 환경에서 다시 시도해 주세요."
          );
        }
        if (response.status === 413) {
          throw new Error(
            "사진 파일 용량이 너무 커서 서버에 전달하지 못했습니다. 다른 사진으로 다시 시도해 주세요."
          );
        }
        if (payload?.error && /[가-힣]/.test(payload.error)) {
          throw new Error(payload.error);
        }
        throw new Error(
          `쇼카드 이미지를 분석하지 못했습니다. (응답 코드: ${response.status}) 잠시 후 다시 시도해 주세요.`
        );
      }

      const extracted = payload.data;
      const croppedProduct = extracted.productImageBox?.length
        ? await cropProductImageFromShowcard(
            previewDataUrl,
            extracted.productImageBox
          )
        : null;

      setConfig((prev) => ({
        ...prev,
        eventType: extracted.eventType || prev.eventType,
        productName: extracted.productName || prev.productName,
        subInfo: extracted.subInfo,
        price: extracted.price || prev.price,
        priceNote: extracted.priceNote || "",
        cardDiscount: extracted.cardDiscount,
        period: extracted.period,
        productImageUrl: croppedProduct,
        showProductImage: Boolean(croppedProduct),
      }));
      setAnalysisSuccess(true);
    } catch (error) {
      const msg =
        error instanceof Error && /[가-힣]/.test(error.message)
          ? error.message
          : "쇼카드 분석 중 네트워크 또는 서버 응답 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSampleData = () => {
    const nextIndex = (sampleIndex + 1) % SAMPLE_PRESETS.length;
    const preset = SAMPLE_PRESETS[nextIndex];
    setSampleIndex(nextIndex);
    setErrorMessage(null);
    setAnalysisSuccess(false);
    setConfig((prev) => ({
      ...prev,
      storeName: preset.storeName,
      theme: preset.theme,
      productFontSize: preset.productFontSize,
      ...preset.data,
      productImageUrl: null,
      showProductImage: false,
    }));
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setErrorMessage(null);
    setAnalysisSuccess(false);
    setConfig({
      storeName: config.storeName,
      eventType: "",
      productName: "",
      subInfo: "",
      price: "",
      priceNote: "",
      cardDiscount: "",
      period: "",
      productFontSize: 40,
      theme: config.theme,
      productImageUrl: null,
      showProductImage: false,
    });
  };

  const handleDownloadPng = async () => {
    const posterEl = document.getElementById("promo-poster");
    if (!posterEl || isExporting || isAnalyzing) return;

    setIsExporting(true);
    setExportSuccess(false);
    setErrorMessage(null);

    try {
      const dataUrl = await toPng(posterEl, {
        cacheBust: true,
        pixelRatio: 3,
      });

      const safeProduct = (config.productName || "쇼카드_홍보물")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .slice(0, 30);
      const link = document.createElement("a");
      link.download = `${safeProduct}_포스터.png`;
      link.href = dataUrl;
      link.click();

      setExportSuccess(true);
      window.setTimeout(() => setExportSuccess(false), 2500);
    } catch {
      try {
        const dataUrl = await toPng(posterEl, {
          cacheBust: true,
          pixelRatio: 3,
          skipFonts: true,
        });
        const link = document.createElement("a");
        link.download = "쇼카드_홍보포스터.png";
        link.href = dataUrl;
        link.click();
        setExportSuccess(true);
        window.setTimeout(() => setExportSuccess(false), 2500);
      } catch {
        setErrorMessage(
          "이미지를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 상단 내비게이션 바 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a
            href="/"
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            편의점 쇼카드 홍보물 메이커
          </a>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLoadSampleData}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>샘플 쇼카드 데이터 채우기</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isAnalyzing}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>비우기</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 2단 작업 공간 */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* 왼쪽 컬럼: 업로드 & 실시간 커스터마이징 */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-5">
            <ShowCardUploader
              isAnalyzing={isAnalyzing}
              previewUrl={previewUrl}
              errorMessage={errorMessage}
              analysisSuccess={analysisSuccess}
              onImageSelected={handleImageSelected}
              onError={(msg) => setErrorMessage(msg)}
            />

            <PosterEditorPanel
              config={config}
              isAnalyzing={isAnalyzing}
              onChange={handleFieldChange}
            />
          </div>

          {/* 오른쪽 컬럼: 실시간 4:5 포스터 미리보기 & PNG 내보내기 */}
          <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-24">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    실시간 포스터 미리보기
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    4:5 비율 · 인스타그램 · 카카오톡 채널 · 매장 POP 최적화
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={isExporting || isAnalyzing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>이미지 생성 중...</span>
                    </>
                  ) : exportSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>저장 완료!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>이미지로 저장 (PNG)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-100/80 border border-slate-200/70 rounded-2xl p-4 sm:p-6">
                <PromoPosterPreview config={config} isAnalyzing={isAnalyzing} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>고해상도 PNG(3배율)로 즉시 저장됩니다.</span>
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  disabled={isAnalyzing}
                  className="font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                >
                  다른 샘플 테마 보기 →
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
