import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIndex = process.argv.indexOf("--port");
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsed = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const envPort = Number(process.env.PORT);
  if (Number.isFinite(envPort) && envPort > 0) {
    return envPort;
  }
  return 3000;
}

const PORT = resolvePort();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const SHOWCARD_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    eventType: {
      type: Type.STRING,
      description: "행사 유형 (예: 1+1, 2+1, 초특가 할인, 증정행사)",
    },
    productName: {
      type: Type.STRING,
      description: "상품명 (브랜드와 제품명을 읽기 쉽게 띄어쓰기 정리)",
    },
    subInfo: {
      type: Type.STRING,
      description:
        "용량, 규격, 매수, 또는 CU 키핑/교차가능 등 핵심 서브 혜택 (예: 중형 16P · CU 키핑 가능)",
    },
    price: {
      type: Type.STRING,
      description: "최종 판매가 또는 행사가 (예: 11,900원)",
    },
    priceNote: {
      type: Type.STRING,
      description:
        "1+1 또는 2+1일 때 개당 체감가 또는 추가 가격 안내 (예: 1+1 적용 시 개당 5,950원). 해당 없으면 빈 문자열.",
    },
    cardDiscount: {
      type: Type.STRING,
      description:
        "카드·간편결제·포켓CU 추가할인 조건 (예: CU Npay 추가할인 (포켓CU 확인)). 없으면 빈 문자열.",
    },
    period: {
      type: Type.STRING,
      description: "행사 기간 (예: 11.1 ~ 11.30). 없으면 빈 문자열.",
    },
    productImageBox: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description:
        "쇼카드 사진 안에 인쇄된 상품 패키지/제품 사진 영역의 정규화 좌표 [ymin, xmin, ymax, xmax] (0~1000 정수). 상품 사진이 없으면 빈 배열 [].",
    },
  },
  required: [
    "eventType",
    "productName",
    "subInfo",
    "price",
    "priceNote",
    "cardDiscount",
    "period",
    "productImageBox",
  ],
};

async function analyzeWithModel(
  ai: GoogleGenAI,
  model: string,
  mimeType: string,
  cleanBase64: string,
  promptText: string,
  useLowThinking = false
) {
  return ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: SHOWCARD_RESPONSE_SCHEMA,
      ...(useLowThinking
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : {}),
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "20mb" }));

  app.get("/api/health", (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    res.json({
      ok: true,
      hasApiKey: Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY"),
    });
  });

  app.post("/api/analyze-showcard", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== "string") {
        res.status(400).json({
          error: "분석할 쇼카드 이미지 데이터가 올바르지 않습니다.",
        });
        return;
      }

      const resolvedMimeType =
        mimeType && typeof mimeType === "string" && mimeType.startsWith("image/")
          ? mimeType
          : "image/jpeg";

      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const ai = getGeminiClient();

      const promptText = [
        "당신은 대한민국 편의점(CU, GS25, 세븐일레븐, 이마트24) 매장 쇼카드(가격표/행사 POP 택) 판독 전문가입니다.",
        "첨부된 편의점 쇼카드 사진에서 아래 정보를 정확하게 추출해 주세요.",
        "QR코드 옆의 4자리 진열/발주 코드(예: 3337)나 바코드 숫자는 절대 상품명이나 가격에 포함하지 마세요.",
        "사진에 해당 정보가 없다면 빈 문자열(\"\")로 반환하세요.",
        "",
        "1. eventType: 행사 유형 (예: 1+1, 2+1, 초특가 할인, 증정행사)",
        "2. productName: 상품명. '라엘)순면커버중형16P'처럼 괄호나 붙여쓰기로 표기된 POS 약어는 고객이 읽기 좋게 '라엘 순면커버 중형 16P'처럼 자연스럽게 띄어 써주세요.",
        "3. subInfo: 용량·규격·교차 여부·'CU 키핑' 같은 추가 편의 혜택 요약 (예: '중형 16개입 · CU 키핑 가능', '500ml · 교차구매 가능')",
        "4. price: 쇼카드에 적힌 최종 판매가 (예: 11,900원)",
        "5. priceNote: 1+1이나 2+1 행사이고 가격 계산이 명확할 때만 개당 체감가 안내 생성 (예: 1+1이고 11,900원이면 '1+1 적용 시 개당 5,950원'). 계산이 모호하면 빈 문자열.",
        "6. cardDiscount: 카드 즉시할인, 간편결제, 포켓CU 추가할인 조건 (예: 'CU Npay 추가할인 (포켓CU 확인)', '삼성카드 20% 현장할인'). 없으면 빈 문자열.",
        "7. period: 행사 기간 (예: '11.1 ~ 11.30'). 없으면 빈 문자열.",
        "8. productImageBox: 쇼카드 내부에 상품 패키지 썸네일 사진이 인쇄되어 있으면 해당 상품 이미지 영역만 타이트하게 감싸는 [ymin, xmin, ymax, xmax] (0~1000 정규화 좌표 4개 정수). 없으면 빈 배열 [].",
      ].join("\n");

      let response;
      try {
        response = await analyzeWithModel(
          ai,
          "gemini-2.5-flash",
          resolvedMimeType,
          cleanBase64,
          promptText,
          false
        );
      } catch (primaryErr) {
        const errMsg =
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        console.warn("Primary model error:", errMsg);
        if (errMsg.includes("404") || errMsg.includes("NOT_FOUND")) {
          response = await analyzeWithModel(
            ai,
            "gemini-4-hydrogen",
            resolvedMimeType,
            cleanBase64,
            promptText,
            true
          );
        } else {
          throw primaryErr;
        }
      }

      const rawText = (response.text ?? "{}")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(rawText || "{}");

      const box = Array.isArray(parsed.productImageBox)
        ? parsed.productImageBox
            .map((n: unknown) => Number(n))
            .filter((n: number) => Number.isFinite(n))
        : [];

      res.json({
        data: {
          eventType: typeof parsed.eventType === "string" ? parsed.eventType : "",
          productName:
            typeof parsed.productName === "string" ? parsed.productName : "",
          subInfo: typeof parsed.subInfo === "string" ? parsed.subInfo : "",
          price: typeof parsed.price === "string" ? parsed.price : "",
          priceNote:
            typeof parsed.priceNote === "string" ? parsed.priceNote : "",
          cardDiscount:
            typeof parsed.cardDiscount === "string" ? parsed.cardDiscount : "",
          period: typeof parsed.period === "string" ? parsed.period : "",
          productImageBox: box.length === 4 ? box : [],
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      console.error("Showcard analysis error:", message);

      if (message === "GEMINI_API_KEY_MISSING") {
        res.status(500).json({
          error:
            "Gemini API 키가 설정되지 않았습니다. Settings > Secrets 패널에서 GEMINI_API_KEY를 확인해 주세요.",
        });
        return;
      }

      if (
        message.includes("API_KEY_INVALID") ||
        message.includes("PERMISSION_DENIED") ||
        message.includes("403")
      ) {
        res.status(403).json({
          error:
            "Gemini API 키가 유효하지 않거나 권한이 없습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.",
        });
        return;
      }

      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          error:
            "요청이 많아 일시적으로 분석이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }

      res.status(500).json({
        error:
          "쇼카드 이미지를 분석하는 중 문제가 발생했습니다. 선명한 사진으로 다시 시도해 주세요.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
