
import {
  serializeLayout,
  deserializeLayout,
  type SavedLayout,
} from "../layout/serializer";

const MAX_SHARE_URL_LENGTH = 8000;

export function createShareUrl(
  layout: SavedLayout,
  baseUrl: string,
): string {
  const serialized = serializeLayout(layout);

  const shareUrl =
    `${baseUrl.split("#")[0]}#shared-layout=${encodeURIComponent(serialized)}`;

  if (shareUrl.length > MAX_SHARE_URL_LENGTH) {
    throw new Error(
      "Layout is too large to share through a URL. Use Export JSON instead.",
    );
  }

  return shareUrl;
}


export function readSharedLayout(
  hash: string,
): SavedLayout | null {
  const prefix = "#shared-layout=";

  if (!hash.startsWith(prefix)) {
    return null;
  }

  if (hash.length > MAX_SHARE_URL_LENGTH) {
    throw new Error("Shared layout URL is too large.");
  }

  const encodedLayout = hash.slice(prefix.length);

  if (!encodedLayout.trim()) {
    throw new Error("Shared layout data is empty.");
  }

  try {
    const decodedLayout = decodeURIComponent(encodedLayout);

    return deserializeLayout(decodedLayout);
  } catch {
    throw new Error("Invalid shared layout URL.");
  }
}
