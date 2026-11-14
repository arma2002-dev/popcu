import React, { useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanLine,
  Upload,
} from "lucide-react";

interface ShowCardUploaderProps {
  isAnalyzing: boolean;
  previewUrl: string | null;
  errorMessage: string | null;
  analysisSuccess: boolean;
  onImageSelected: (base64: string, mimeType: string, previewDataUrl: string) => void;
  onError: (message: string) => void;
}

const SAMPLE_SHOWCARD_PATH = "/assets/aistudio/IMG_4819_a761a157.jpeg";
const MAX_BASE64_CHARS = 650_000; // ~485KB binary, safely under 1MB proxy limits

function isAcceptedImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
}

async function compressImageToSafeJpeg(
  sourceUrl: string
): Promise<{ base64: string; mimeType: string; previewDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () =>
      reject(
        new Error(
          "지원하지 않는 이미지 형식입니다. JPG 또는 PNG 사진을 사용해 주세요."
        )
      );
    img.onload = () => {
      const steps: Array<{ maxDim: number; quality: number }> = [
        { maxDim: 1280, quality: 0.82 },
        { maxDim: 1024, quality: 0.74 },
        { maxDim: 860, quality: 0.65 },
      ];

      let finalDataUrl = "";
      let finalBase64 = "";

      for (const step of steps) {
        let { width, height } = img;
        if (width > step.maxDim || height > step.maxDim) {
          if (width >= height) {
            height = Math.round((height * step.maxDim) / width);
            width = step.maxDim;
          } else {
            width = Math.round((width * step.maxDim) / height);
            height = step.maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("이미지 캔버스를 초기화할 수 없습니다."));
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", step.quality);
        const commaIdx = dataUrl.indexOf(",");
        const base64Only = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

        finalDataUrl = dataUrl;
        finalBase64 = base64Only;

        if (base64Only.length <= MAX_BASE64_CHARS) {
          break;
        }
      }

      if (!finalBase64) {
        reject(new Error("이미지 데이터를 변환하지 못했습니다."));
        return;
      }

      resolve({
        base64: finalBase64,
        mimeType: "image/jpeg",
        previewDataUrl: finalDataUrl,
      });
    };
    img.src = sourceUrl;
  });
}

async function resizeFileToJpeg(
  file: File
): Promise<{ base64: string; mimeType: string; previewDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
    reader.onload = async () => {
      try {
        const result = await compressImageToSafeJpeg(reader.result as string);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

export function ShowCardUploader({
  isAnalyzing,
  previewUrl,
  errorMessage,
  analysisSuccess,
  onImageSelected,
  onError,
}: ShowCardUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImageFile(file)) {
      onError("이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.");
      return;
    }

    try {
      const { base64, mimeType, previewDataUrl } = await resizeFileToJpeg(file);
      onImageSelected(base64, mimeType, previewDataUrl);
    } catch (err) {
      const msg =
        err instanceof Error && /[가-힣]/.test(err.message)
          ? err.message
          : "이미지를 처리하는 중 오류가 발생했습니다. JPG 또는 PNG 사진으로 다시 시도해 주세요.";
      onError(msg);
    }
  };

  const handleAnalyzeSamplePhoto = async () => {
    if (isAnalyzing) return;
    try {
      const res = await fetch(SAMPLE_SHOWCARD_PATH);
      if (!res.ok) {
        throw new Error("예시 쇼카드 이미지를 불러오지 못했습니다.");
      }
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onerror = () =>
        onError("예시 쇼카드 이미지를 읽는 중 오류가 발생했습니다.");
      reader.onload = async () => {
        try {
          const { base64, mimeType, previewDataUrl } =
            await compressImageToSafeJpeg(reader.result as string);
          onImageSelected(base64, mimeType, previewDataUrl);
        } catch (err) {
          const msg =
            err instanceof Error && /[가-힣]/.test(err.message)
              ? err.message
              : "예시 이미지를 처리하지 못했습니다.";
          onError(msg);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      const msg =
        err instanceof Error && /[가-힣]/.test(err.message)
          ? err.message
          : "예시 쇼카드 이미지를 불러오지 못했습니다.";
      onError(msg);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isAnalyzing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            1. 쇼카드 사진 올리기
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            매장 가격표·행사 택 사진을 올리면 AI가 문구와 상품 이미지를 자동 추출합니다
          </p>
        </div>
        {previewUrl && !isAnalyzing && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>다시 올리기</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          void handleFile(file);
          e.target.value = "";
        }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          void handleFile(file);
          e.target.value = "";
        }}
      />

      {isAnalyzing ? (
        <div className="border border-purple-200 bg-purple-50/60 rounded-xl p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-purple-950">
                쇼카드 내용을 분석하고 있어요...
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                행사 유형, 상품명, 가격, 할인 조건, 상품 썸네일을 추출 중입니다
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-3 bg-purple-200/70 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-purple-200/50 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ) : previewUrl ? (
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-3.5">
          <img
            src={previewUrl}
            alt="업로드된 쇼카드 사진"
            className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
          />
          <div className="min-w-0 flex-1">
            {analysisSuccess ? (
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>AI 정보 추출 완료 · 아래에서 문구를 다듬어 보세요</span>
              </div>
            ) : (
              <div className="text-xs font-medium text-slate-700">
                업로드된 쇼카드 이미지
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              다른 쇼카드를 분석하려면 상단 &apos;다시 올리기&apos;를 누르세요.
            </p>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer select-none ${
            isDragging
              ? "border-purple-600 bg-purple-50/70"
              : "border-slate-300 bg-slate-50/60 hover:border-purple-400 hover:bg-slate-50"
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center mx-auto mb-3">
            <ImagePlus className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            쇼카드 사진을 끌어다 놓거나 클릭해서 선택하세요
          </p>
          <p className="text-xs text-slate-500 mt-1">
            JPG, PNG, WEBP 지원 · 행사 매대 가격표 촬영본 가능
          </p>

          <div
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>파일 선택</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>카메라 촬영</span>
            </button>
          </div>
        </div>
      )}

      {/* 실제 매장 쇼카드 사진으로 바로 AI 인식 테스트 */}
      {!isAnalyzing && (
        <div className="mt-3 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={SAMPLE_SHOWCARD_PATH}
              alt="실제 편의점 1+1 쇼카드 예시"
              className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                실제 편의점 쇼카드로 테스트
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                첨부된 CU 1+1 쇼카드 사진을 AI로 즉시 분석합니다
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAnalyzeSamplePhoto}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>AI 분석 실행</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      )}
    </section>
  );
}
