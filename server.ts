import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "20mb" }));

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
        "당신은 대한민국 편의점 매장 쇼카드(가격표/행사 POP 택) 판독 전문가입니다.",
        "첨부된 편의점 쇼카드 사진에서 아래 6가지 핵심 홍보 정보를 정확히 추출해 주세요.",
        "사진에 해당 정보가 명확히 적혀 있지 않다면 빈 문자열(\"\")로 반환하고, 추측하여 지어내지 마세요.",
        "1. eventType: 행사 유형 (예: 1+1, 2+1, 초특가 할인, 증정행사, 덤증정, 할인)",
        "2. productName: 상품명 (브랜드명과 제품명을 자연스럽게 읽기 좋게 정리)",
        "3. subInfo: 용량, 규격, 맛, 또는 간단한 서브 카피 (예: 500ml / 캔, 오리지널 외 2종 교차가능)",
        "4. price: 최종 판매가 또는 행사가 (예: 2,200원, 2개 3,000원, 개당 1,100원)",
        "5. cardDiscount: 카드 즉시할인 또는 제휴 할인 조건 (예: 삼성카드 결제 시 20% 현장할인, 카카오페이머니 1,000원 즉시할인)",
        "6. period: 행사 기간 (예: 11월 1일 ~ 11월 30일, 11.01~11.30)",
      ].join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
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
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              eventType: {
                type: Type.STRING,
                description: "행사 유형 (예: 1+1, 2+1, 초특가 할인, 증정행사)",
              },
              productName: {
                type: Type.STRING,
                description: "상품명",
              },
              subInfo: {
                type: Type.STRING,
                description: "용량, 규격, 또는 간단한 서브 카피",
              },
              price: {
                type: Type.STRING,
                description: "최종 판매가 또는 행사가",
              },
              cardDiscount: {
                type: Type.STRING,
                description: "카드 즉시할인 조건 (없으면 빈 문자열)",
              },
              period: {
                type: Type.STRING,
                description: "행사 기간 (없으면 빈 문자열)",
              },
            },
            required: [
              "eventType",
              "productName",
              "subInfo",
              "price",
              "cardDiscount",
              "period",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);

      res.json({
        data: {
          eventType: typeof parsed.eventType === "string" ? parsed.eventType : "",
          productName: typeof parsed.productName === "string" ? parsed.productName : "",
          subInfo: typeof parsed.subInfo === "string" ? parsed.subInfo : "",
          price: typeof parsed.price === "string" ? parsed.price : "",
          cardDiscount: typeof parsed.cardDiscount === "string" ? parsed.cardDiscount : "",
          period: typeof parsed.period === "string" ? parsed.period : "",
        },
      });
    } catch (error) {
      console.error("Showcard analysis error:", error);

      if (error instanceof Error && error.message === "GEMINI_API_KEY_MISSING") {
        res.status(500).json({
          error: "서버에 Gemini API 키가 설정되지 않았습니다. 환경 설정을 확인해 주세요.",
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          error: "요청이 많아 일시적으로 분석이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }

      res.status(500).json({
        error: "쇼카드 이미지를 분석하는 중 문제가 발생했습니다. 선명한 사진으로 다시 시도해 주세요.",
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
