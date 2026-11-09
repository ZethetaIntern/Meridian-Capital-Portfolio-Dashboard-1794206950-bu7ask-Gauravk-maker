
import type { Layout } from "react-grid-layout";

export interface LayoutSnapshot {
  id: string;
  name: string;
  createdAt: string;
  layout: Layout[];
}

const STORAGE_KEY = "meridian-layout-history-v1";
const MAX_HISTORY = 10;

export function getLayoutHistory(): LayoutSnapshot[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is LayoutSnapshot => {
      if (!item || typeof item !== "object") return false;

      const snapshot = item as Record<string, unknown>;

      return (
        typeof snapshot.id === "string" &&
        typeof snapshot.name === "string" &&
        typeof snapshot.createdAt === "string" &&
        Array.isArray(snapshot.layout)
      );
    });
  } catch {
    return [];
  }
}

export function saveLayoutSnapshot(
  name: string,
  layout: Layout[],
): LayoutSnapshot[] {
  if (!name.trim()) {
    throw new Error("Layout name is required.");
  }

  const snapshot: LayoutSnapshot = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 60),
    createdAt: new Date().toISOString(),
    layout: layout.map((item) => ({ ...item })),
  };

  const history = [
    snapshot,
    ...getLayoutHistory(),
  ].slice(0, MAX_HISTORY);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  return history;
}

export function deleteLayoutSnapshot(
  id: string,
): LayoutSnapshot[] {
  const history = getLayoutHistory().filter(
    (snapshot) => snapshot.id !== id,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  return history;
}
