import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import {
  OperationType,
  db,
  handleFirestoreError,
  sanitizePosterFields,
} from "../firebase";
import type {
  PosterConfig,
  PosterHistoryItem,
  PosterHistorySource,
} from "../types/showcard";

export interface WorkspaceSnapshotData {
  activePosterId: string;
  config: PosterConfig;
  updatedAtMs: number;
}

function timestampToMs(ts: unknown): number {
  if (ts && typeof ts === "object" && "toMillis" in ts) {
    return (ts as Timestamp).toMillis();
  }
  return Date.now();
}

function docToPosterConfig(data: Record<string, unknown>): PosterConfig {
  const imgUrl =
    typeof data.productImageUrl === "string" && data.productImageUrl.length > 0
      ? data.productImageUrl
      : null;

  return {
    eventType: typeof data.eventType === "string" ? data.eventType : "",
    productName: typeof data.productName === "string" ? data.productName : "",
    subInfo: typeof data.subInfo === "string" ? data.subInfo : "",
    price: typeof data.price === "string" ? data.price : "",
    priceNote: typeof data.priceNote === "string" ? data.priceNote : "",
    cardDiscount:
      typeof data.cardDiscount === "string" ? data.cardDiscount : "",
    period: typeof data.period === "string" ? data.period : "",
    productFontSize:
      typeof data.productFontSize === "number" ? data.productFontSize : 34,
    theme: data.theme === "cu-bottom" ? "cu-bottom" : "cu-top",
    productImageUrl: imgUrl,
    showProductImage: Boolean(data.showProductImage && imgUrl),
  };
}

export function subscribeToWorkspace(
  userId: string,
  onData: (data: WorkspaceSnapshotData | null, hasPendingWrites: boolean) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const workspacePath = `users/${userId}/workspace/current`;
  const workspaceRef = doc(db, "users", userId, "workspace", "current");

  return onSnapshot(
    workspaceRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null, snapshot.metadata.hasPendingWrites);
        return;
      }
      const raw = snapshot.data() as Record<string, unknown>;
      onData(
        {
          activePosterId:
            typeof raw.activePosterId === "string" ? raw.activePosterId : "",
          config: docToPosterConfig(raw),
          updatedAtMs: timestampToMs(raw.updatedAt),
        },
        snapshot.metadata.hasPendingWrites
      );
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, workspacePath);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function saveWorkspaceDraft(
  userId: string,
  activePosterId: string,
  config: PosterConfig
): Promise<void> {
  const workspacePath = `users/${userId}/workspace/current`;
  const workspaceRef = doc(db, "users", userId, "workspace", "current");
  const safeFields = sanitizePosterFields(config);
  const safeActiveId = (activePosterId || "").slice(0, 128);

  try {
    const existingSnap = await getDoc(workspaceRef);
    if (!existingSnap.exists()) {
      await setDoc(workspaceRef, {
        userId,
        activePosterId: safeActiveId,
        ...safeFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(workspaceRef, {
        activePosterId: safeActiveId,
        ...safeFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, workspacePath);
  }
}

export function subscribeToPosterHistory(
  userId: string,
  onData: (items: PosterHistoryItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const collectionPath = `users/${userId}/posters`;
  const postersQuery = query(
    collection(db, "users", userId, "posters"),
    where("userId", "==", userId),
    limit(50)
  );

  return onSnapshot(
    postersQuery,
    (snapshot) => {
      const items: PosterHistoryItem[] = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        const source: PosterHistorySource =
          raw.source === "ai-scan" || raw.source === "sample"
            ? raw.source
            : "manual";
        return {
          id: docSnap.id,
          ...docToPosterConfig(raw),
          source,
          createdAtMs: timestampToMs(raw.createdAt),
          updatedAtMs: timestampToMs(raw.updatedAt),
        };
      });

      items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

function generatePosterId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `poster_${Date.now()}_${rand}`;
}

export async function savePosterToHistory(
  userId: string,
  config: PosterConfig,
  source: PosterHistorySource,
  existingPosterId?: string
): Promise<string> {
  const safeFields = sanitizePosterFields(config);
  const targetId =
    existingPosterId && /^[a-zA-Z0-9_-]{1,128}$/.test(existingPosterId)
      ? existingPosterId
      : generatePosterId();
  const docPath = `users/${userId}/posters/${targetId}`;
  const docRef = doc(db, "users", userId, "posters", targetId);

  try {
    if (existingPosterId) {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        await updateDoc(docRef, {
          ...safeFields,
          source,
          updatedAt: serverTimestamp(),
        });
        return targetId;
      }
    }

    await setDoc(docRef, {
      userId,
      ...safeFields,
      source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return targetId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deletePosterFromHistory(
  userId: string,
  posterId: string
): Promise<void> {
  const docPath = `users/${userId}/posters/${posterId}`;
  const docRef = doc(db, "users", userId, "posters", posterId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
