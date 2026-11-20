import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { toPng } from "html-to-image";
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Download,
  ExternalLink,
  History,
  Loader2,
  LogIn,
  LogOut,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { PosterEditorPanel } from "./components/PosterEditorPanel";
import { PosterHistoryPanel } from "./components/PosterHistoryPanel";
import { PromoPosterPreview } from "./components/PromoPosterPreview";
import { ShowCardUploader } from "./components/ShowCardUploader";
import { DEFAULT_POSTER_CONFIG, SAMPLE_PRESETS } from "./constants/samples";
import {
  FIREBASE_PROJECT_ID,
  auth,
  signInWithGoogle,
  signOutUser,
} from "./firebase";
import {
  deletePosterFromHistory,
  savePosterToHistory,
  saveWorkspaceDraft,
  subscribeToPosterHistory,
  subscribeToWorkspace,
} from "./services/posterSyncService";
import type {
  PosterConfig,
  PosterHistoryItem,
  PosterHistorySource,
  ShowCardData,
} from "./types/showcard";
import { compressThumbnailDataUrl } from "./utils/imageCompression";

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
    img.onload = async () => {
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
      const rawCrop = canvas.toDataURL("image/jpeg", 0.9);
      const compressed = await compressThumbnailDataUrl(rawCrop);
      resolve(compressed ?? rawCrop);
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

  // Firebase Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<{
    message: string;
    code?: string;
    unauthorizedDomain?: string;
  } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [syncState, setSyncState] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [lastSyncedAtMs, setLastSyncedAtMs] = useState<number | null>(null);

  const isInIframe =
    typeof window !== "undefined" && window.self !== window.top;
  const isInAppBrowser =
    typeof navigator !== "undefined" &&
    /KAKAOTALK|NAVER|Line|Instagram|FBAN|FBAV|; wv\)/i.test(navigator.userAgent);

  const buildAuthErrorState = (err: unknown) => {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    const host =
      typeof window !== "undefined" ? window.location.hostname : "";

    if (
      code === "auth/unauthorized-domain" ||
      code === "auth/unauthorized-continue-uri" ||
      code === "auth/app-not-authorized"
    ) {
      return {
        code,
        unauthorizedDomain: host,
        message: `현재 접속한 도메인(${host})이 Firebase 승인 도메인에 등록되지 않았거나 앱 인증이 허용되지 않았습니다(${code}). 아래 '도메인 복사' 후 Firebase Console 승인된 도메인에 추가하거나 AI Studio 기본 URL에서 접속해 주세요.`,
      };
    }

    if (code === "auth/web-storage-unsupported") {
      return {
        code,
        message: isInIframe
          ? "현재 미리보기 창이나 브라우저 설정에서 서드파티 쿠키/웹 저장소가 제한되어 팝업 로그인을 완료할 수 없습니다. 아래 '새 창에서 열어 로그인'을 눌러 주세요."
          : "브라우저 설정(시크릿 모드 또는 쿠키 차단)으로 인해 로그인 저장소를 사용할 수 없습니다. 일반 브라우저 창에서 쿠키를 허용한 뒤 다시 시도해 주세요.",
      };
    }

    if (code === "auth/internal-error") {
      return {
        code,
        message: isInIframe
          ? "미리보기 창 내부 보안 정책으로 Google 인증 모듈 연결에 실패했습니다(auth/internal-error). 아래 '새 창에서 열어 로그인'을 이용해 주세요."
          : "인증 서버 연결 중 일시적인 오류가 발생했습니다(auth/internal-error). 브라우저의 팝업 및 쿠키 설정을 확인한 뒤 다시 시도해 주세요.",
      };
    }

    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      return {
        code,
        message:
          "브라우저에서 로그인 팝업이 차단되었거나 지원되지 않습니다. 팝업 차단을 해제한 뒤 다시 시도해 주세요.",
      };
    }

    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return {
        code,
        message: isInAppBrowser
          ? "카카오톡·네이버 등 인앱 브라우저에서는 Google 로그인이 차단될 수 있습니다. 우측 메뉴에서 'Chrome 또는 Safari로 열기' 후 다시 시도해 주세요."
          : isInIframe
          ? "미리보기 창(iframe) 내부에서는 브라우저 보안 정책으로 로그인 팝업 연동이 끊길 수 있습니다. 아래 '새 창에서 열어 로그인'으로 진행해 주세요."
          : "로그인 팝업 창이 닫혀 완료되지 않았습니다. 다시 시도하려면 'Google 로그인으로 동기화'를 눌러 주세요.",
      };
    }

    if (code === "auth/operation-not-allowed") {
      return {
        code,
        message:
          "Firebase Authentication에서 Google 로그인 제공업체가 활성화되어 있지 않습니다.",
      };
    }

    if (code === "auth/network-request-failed") {
      return {
        code,
        message:
          "네트워크 연결이 원활하지 않아 Google 로그인에 실패했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      };
    }

    return {
      code,
      message: `Google 로그인 중 오류가 발생했습니다.${code ? ` (${code})` : ""} 잠시 후 다시 시도해 주세요.`,
    };
  };

  // Saved History State
  const [historyItems, setHistoryItems] = useState<PosterHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [activePosterId, setActivePosterId] = useState<string>("");
  const [activeSource, setActiveSource] =
    useState<PosterHistorySource>("manual");

  const hasLocalEditsRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const historySyncTimerRef = useRef<number | null>(null);
  const suppressNextRemoteApplyRef = useRef(false);
  const latestConfigRef = useRef(config);
  const latestActivePosterIdRef = useRef(activePosterId);
  const latestSourceRef = useRef(activeSource);

  latestConfigRef.current = config;
  latestActivePosterIdRef.current = activePosterId;
  latestSourceRef.current = activeSource;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
      if (nextUser) {
        setAuthError(null);
      } else {
        setHistoryItems([]);
        setActivePosterId("");
        setSyncState("idle");
        setLastSyncedAtMs(null);
        setIsLoadingHistory(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    setIsLoadingHistory(true);
    let initialWorkspaceChecked = false;

    const unsubWorkspace = subscribeToWorkspace(
      user.uid,
      (remoteWorkspace, hasPendingWrites) => {
        if (!remoteWorkspace) {
          if (!initialWorkspaceChecked) {
            initialWorkspaceChecked = true;
            setSyncState("syncing");
            void saveWorkspaceDraft(
              user.uid,
              latestActivePosterIdRef.current,
              latestConfigRef.current
            )
              .then(() => {
                setSyncState("synced");
                setLastSyncedAtMs(Date.now());
              })
              .catch(() => setSyncState("error"));
          }
          return;
        }

        initialWorkspaceChecked = true;
        if (hasPendingWrites || suppressNextRemoteApplyRef.current) {
          suppressNextRemoteApplyRef.current = false;
          setSyncState("synced");
          setLastSyncedAtMs(remoteWorkspace.updatedAtMs);
          return;
        }

        if (!hasLocalEditsRef.current || syncTimerRef.current === null) {
          setConfig(remoteWorkspace.config);
          setActivePosterId(remoteWorkspace.activePosterId);
          setSyncState("synced");
          setLastSyncedAtMs(remoteWorkspace.updatedAtMs);
        }
      },
      () => {
        setSyncState("error");
      }
    );

    const unsubHistory = subscribeToPosterHistory(
      user.uid,
      (items) => {
        setHistoryItems(items);
        setIsLoadingHistory(false);
      },
      () => {
        setIsLoadingHistory(false);
        setSyncState("error");
      }
    );

    return () => {
      unsubWorkspace();
      unsubHistory();
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (historySyncTimerRef.current !== null) {
        window.clearTimeout(historySyncTimerRef.current);
        historySyncTimerRef.current = null;
      }
    };
  }, [isAuthReady, user]);

  const scheduleCloudSync = (
    nextConfig: PosterConfig,
    nextActivePosterId: string,
    nextSource: PosterHistorySource
  ) => {
    if (!user || !isAuthReady) return;

    hasLocalEditsRef.current = true;
    setSyncState("syncing");

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;
      suppressNextRemoteApplyRef.current = true;
      void saveWorkspaceDraft(user.uid, nextActivePosterId, nextConfig)
        .then(() => {
          hasLocalEditsRef.current = false;
          setSyncState("synced");
          setLastSyncedAtMs(Date.now());
        })
        .catch(() => {
          setSyncState("error");
        });
    }, 450);

    if (nextActivePosterId) {
      if (historySyncTimerRef.current !== null) {
        window.clearTimeout(historySyncTimerRef.current);
      }
      historySyncTimerRef.current = window.setTimeout(() => {
        historySyncTimerRef.current = null;
        void savePosterToHistory(
          user.uid,
          nextConfig,
          nextSource,
          nextActivePosterId
        ).catch(() => {
          setSyncState("error");
        });
      }, 1100);
    }
  };

  const syncImmediately = async (
    nextConfig: PosterConfig,
    nextActivePosterId: string
  ) => {
    if (!user || !isAuthReady) return;
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    setSyncState("syncing");
    suppressNextRemoteApplyRef.current = true;
    try {
      await saveWorkspaceDraft(user.uid, nextActivePosterId, nextConfig);
      hasLocalEditsRef.current = false;
      setSyncState("synced");
      setLastSyncedAtMs(Date.now());
    } catch {
      setSyncState("error");
    }
  };

  const handleGoogleSignIn = async () => {
    if (isAuthBusy) return;
    setIsAuthBusy(true);
    setAuthError(null);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(buildAuthErrorState(err));
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleCopyUnauthorizedDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // Clipboard write unavailable
    }
  };

  const handleSignOut = async () => {
    if (isAuthBusy) return;
    setIsAuthBusy(true);
    try {
      await signOutUser();
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleFieldChange = <K extends keyof PosterConfig>(
    key: K,
    value: PosterConfig[K]
  ) => {
    const next: PosterConfig = {
      ...latestConfigRef.current,
      [key]: value,
    };
    latestConfigRef.current = next;
    setConfig(next);
    scheduleCloudSync(next, latestActivePosterIdRef.current, latestSourceRef.current);
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
          const host = window.location.hostname;
          const isSharedHost = host.startsWith("ais-pre-");
          const snippet = rawText.replace(/\s+/g, " ").trim().slice(0, 80);
          throw new Error(
            isSharedHost
              ? `공유 URL(${host})에서는 백엔드 API(/api/analyze-showcard)가 실행되지 않아 404가 발생했습니다. AI Studio 편집기의 개발 미리보기(ais-dev) 화면에서 실행해 주세요.`
              : `이미지 분석 서버 경로(/api/analyze-showcard)를 찾을 수 없습니다. (호스트: ${host}, 응답: ${snippet || "404"})`
          );
        }
        if (response.status === 413) {
          throw new Error(
            "사진 파일 용량이 너무 커서 서버에 전달하지 못했습니다. 다른 사진으로 다시 시도해 주세요."
          );
        }
        if (response.status === 504) {
          throw new Error(
            "이미지 분석 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
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

      const baseConfig = latestConfigRef.current;
      const nextConfig: PosterConfig = {
        ...baseConfig,
        eventType: extracted.eventType || baseConfig.eventType,
        productName: extracted.productName || baseConfig.productName,
        subInfo: extracted.subInfo,
        price: extracted.price || baseConfig.price,
        priceNote: extracted.priceNote || "",
        cardDiscount: extracted.cardDiscount,
        period: extracted.period,
        productImageUrl: croppedProduct,
        showProductImage: Boolean(croppedProduct),
      };

      setConfig(nextConfig);
      setActiveSource("ai-scan");
      setAnalysisSuccess(true);

      if (user && isAuthReady) {
        try {
          const newPosterId = await savePosterToHistory(
            user.uid,
            nextConfig,
            "ai-scan"
          );
          setActivePosterId(newPosterId);
          await syncImmediately(nextConfig, newPosterId);
        } catch {
          setSyncState("error");
        }
      }
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

    const nextConfig: PosterConfig = {
      ...config,
      theme: preset.theme,
      productFontSize: preset.productFontSize,
      ...preset.data,
      productImageUrl: null,
      showProductImage: false,
    };
    setConfig(nextConfig);
    setActivePosterId("");
    setActiveSource("sample");
    void syncImmediately(nextConfig, "");
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setErrorMessage(null);
    setAnalysisSuccess(false);

    const nextConfig: PosterConfig = {
      eventType: "",
      productName: "",
      subInfo: "",
      price: "",
      priceNote: "",
      cardDiscount: "",
      period: "",
      productFontSize: 34,
      theme: config.theme,
      productImageUrl: null,
      showProductImage: false,
    };
    setConfig(nextConfig);
    setActivePosterId("");
    setActiveSource("manual");
    void syncImmediately(nextConfig, "");
  };

  const handleSaveCurrentAsNewHistory = async () => {
    if (!user || isSavingHistory) return;
    setIsSavingHistory(true);
    setErrorMessage(null);
    try {
      const newId = await savePosterToHistory(
        user.uid,
        config,
        latestSourceRef.current
      );
      setActivePosterId(newId);
      await syncImmediately(config, newId);
    } catch {
      setErrorMessage(
        "히스토리에 홍보물을 저장하는 중 오류가 발생했습니다. 다시 시도해 주세요."
      );
    } finally {
      setIsSavingHistory(false);
    }
  };

  const handleSelectHistoryItem = async (item: PosterHistoryItem) => {
    setErrorMessage(null);
    setAnalysisSuccess(false);
    setPreviewUrl(null);

    const loadedConfig: PosterConfig = {
      eventType: item.eventType,
      productName: item.productName,
      subInfo: item.subInfo,
      price: item.price,
      priceNote: item.priceNote,
      cardDiscount: item.cardDiscount,
      period: item.period,
      productFontSize: item.productFontSize,
      theme: item.theme,
      productImageUrl: item.productImageUrl,
      showProductImage: item.showProductImage,
    };

    setConfig(loadedConfig);
    setActivePosterId(item.id);
    setActiveSource(item.source);
    await syncImmediately(loadedConfig, item.id);
  };

  const handleDeleteHistoryItem = async (posterId: string) => {
    if (!user) return;
    try {
      await deletePosterFromHistory(user.uid, posterId);
      if (activePosterId === posterId) {
        setActivePosterId("");
        await syncImmediately(config, "");
      }
    } catch {
      setErrorMessage("히스토리 항목을 삭제하는 중 오류가 발생했습니다.");
    }
  };

  const handleDownloadPng = async () => {
    const posterEl = document.getElementById("promo-poster");
    if (!posterEl || isExporting || isAnalyzing) return;

    setIsExporting(true);
    setExportSuccess(false);
    setErrorMessage(null);

    try {
      if (user && !activePosterId && config.productName.trim()) {
        try {
          const newId = await savePosterToHistory(
            user.uid,
            config,
            latestSourceRef.current
          );
          setActivePosterId(newId);
          void syncImmediately(config, newId);
        } catch {
          // Do not block PNG download if history save fails
        }
      }

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

  const scrollToHistory = () => {
    document
      .getElementById("poster-history-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 상단 내비게이션 바 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a
            href="/"
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            편의점 쇼카드 홍보물 메이커
          </a>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={scrollToHistory}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>히스토리</span>
              {user && (
                <span className="font-mono-num text-purple-700 font-bold">
                  {historyItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLoadSampleData}
              disabled={isAnalyzing}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>샘플 채우기</span>
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

      {/* 메인 작업 공간 */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-5 lg:py-7 space-y-5">
        {/* 기기 간 실시간 동기화 상태 바 */}
        <section className="bg-white border border-slate-200 rounded-2xl px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-3">
          {!isAuthReady ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>동기화 계정 상태를 확인하는 중...</span>
            </div>
          ) : user ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {user.email || user.displayName || "내 계정"}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {syncState === "syncing"
                        ? "· 동기화 저장 중..."
                        : syncState === "error"
                        ? "· 동기화 확인 필요"
                        : "· 스마트폰↔PC 실시간 동기화 중"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {lastSyncedAtMs
                      ? `최근 동기화 ${new Date(lastSyncedAtMs).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 같은 Google 계정으로 로그인하면 기기가 즉시 연동됩니다`
                      : "같은 Google 계정으로 로그인한 모든 기기에서 동일한 포스터가 표시됩니다"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveCurrentAsNewHistory}
                  disabled={isSavingHistory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isSavingHistory ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  )}
                  <span>작업 저장</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isAuthBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <CloudOff className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      스마트폰 ↔ 컴퓨터 작업 동기화
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Google 로그인을 연결하면 스마트폰에서 만든 홍보물을 컴퓨터에서도
                      그대로 이어서 볼 수 있고 히스토리가 저장됩니다
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthBusy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isAuthBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                    <span>Google 로그인으로 동기화</span>
                  </button>
                </div>
              </div>

              {isInAppBrowser && !authError && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    카카오톡·네이버 등 인앱 브라우저에서는 Google 로그인이 차단될 수
                    있습니다. 우측 상단 메뉴에서 <strong>Chrome 또는 Safari로 열기</strong>를
                    선택해 주세요.
                  </span>
                </div>
              )}

              {authError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">
                      {authError.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    {authError.unauthorizedDomain && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyUnauthorizedDomain(
                              authError.unauthorizedDomain!
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-800 bg-white border border-red-200 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedDomain ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>
                            {copiedDomain
                              ? "도메인 복사됨"
                              : `도메인 복사 (${authError.unauthorizedDomain})`}
                          </span>
                        </button>
                        <a
                          href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-800 bg-white border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <span>Firebase 승인 도메인 설정</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}

                    {isInIframe && (
                      <a
                        href={
                          typeof window !== "undefined"
                            ? window.location.href
                            : "/"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <span>새 창에서 열어 로그인</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* 왼쪽 컬럼: 업로드, 커스터마이징, 작업 히스토리 */}
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

            <PosterHistoryPanel
              isAuthenticated={Boolean(user)}
              isLoadingHistory={isLoadingHistory}
              isSavingHistory={isSavingHistory}
              isAuthBusy={isAuthBusy}
              authErrorMessage={authError?.message ?? null}
              items={historyItems}
              activePosterId={activePosterId}
              onSignIn={handleGoogleSignIn}
              onSaveCurrentAsNew={handleSaveCurrentAsNewHistory}
              onSelectPoster={handleSelectHistoryItem}
              onDeletePoster={handleDeleteHistoryItem}
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
