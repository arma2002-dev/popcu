import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDocFromServer, getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import type { PosterConfig, PosterThemeId } from "./types/showcard";

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
auth.useDeviceLanguage();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

function sanitizeTheme(theme: unknown): PosterThemeId {
  return theme === "cu-bottom" ? "cu-bottom" : "cu-top";
}

function sanitizeFontSize(size: unknown): number {
  const num = Number(size);
  if (!Number.isFinite(num)) return 34;
  return Math.min(56, Math.max(20, Math.round(num)));
}

export function sanitizePosterFields(config: PosterConfig) {
  const rawImageUrl =
    typeof config.productImageUrl === "string" &&
    config.productImageUrl.length <= 120000
      ? config.productImageUrl
      : "";

  return {
    eventType: clampString(config.eventType, 60),
    productName: clampString(config.productName, 150),
    subInfo: clampString(config.subInfo, 200),
    price: clampString(config.price, 60),
    priceNote: clampString(config.priceNote, 150),
    cardDiscount: clampString(config.cardDiscount, 200),
    period: clampString(config.period, 120),
    productFontSize: sanitizeFontSize(config.productFontSize),
    theme: sanitizeTheme(config.theme),
    productImageUrl: rawImageUrl,
    showProductImage: Boolean(config.showProductImage && rawImageUrl),
  };
}
