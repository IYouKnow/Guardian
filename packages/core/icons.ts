export const ICON_TARGET_SIZE = 32;
export const ICON_MAX_BYTES = 16 * 1024;
export const ICON_PREFERRED_MIME = "image/webp";
export const ICON_FALLBACK_MIME = "image/png";
export const ICON_DEFAULT_QUALITY = 0.8;

export type IconByteSource = {
  bytes: Uint8Array | ArrayBuffer;
  mimeType?: string;
};

export type NormalizeIconSource = Blob | File | string | IconByteSource;

export type NormalizeIconOptions = {
  size?: number;
  maxBytes?: number;
  quality?: number;
  preferredMimeType?: string;
  fallbackMimeType?: string;
};

function isIconByteSource(source: NormalizeIconSource): source is IconByteSource {
  return typeof source === "object"
    && source != null
    && !(typeof Blob !== "undefined" && source instanceof Blob)
    && "bytes" in source;
}

function base64Payload(dataUrl: string): string {
  const raw = (dataUrl || "").trim();
  const commaIndex = raw.indexOf(",");
  return commaIndex >= 0 ? raw.slice(commaIndex + 1) : "";
}

function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const payload = base64Payload(dataUrl);
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

export function isNormalizedIconDataUrl(
  dataUrl: string,
  options: Pick<NormalizeIconOptions, "maxBytes" | "preferredMimeType" | "fallbackMimeType"> = {},
): boolean {
  const raw = (dataUrl || "").trim();
  if (!raw.startsWith("data:image/")) return false;

  const allowed = new Set([
    options.preferredMimeType || ICON_PREFERRED_MIME,
    options.fallbackMimeType || ICON_FALLBACK_MIME,
  ]);
  const mimeEnd = raw.indexOf(";");
  const mime = mimeEnd > 5 ? raw.slice(5, mimeEnd) : "";
  if (!allowed.has(mime)) return false;

  return estimateDataUrlBytes(raw) <= (options.maxBytes || ICON_MAX_BYTES);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode icon image."));
    image.src = src;
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || ICON_FALLBACK_MIME};base64,${bytesToBase64(bytes)}`;
}

function toBlobSource(source: NormalizeIconSource): { blob: Blob; revokeUrl?: undefined } | null {
  if (typeof Blob !== "undefined" && source instanceof Blob) {
    return { blob: source };
  }

  if (isIconByteSource(source)) {
    const bytes = source.bytes instanceof Uint8Array ? source.bytes : new Uint8Array(source.bytes);
    const copied = new Uint8Array(bytes.byteLength);
    copied.set(bytes);
    return { blob: new Blob([copied.buffer], { type: source.mimeType || ICON_FALLBACK_MIME }) };
  }

  return null;
}

function buildMimeCandidates(preferredMimeType: string, fallbackMimeType: string): Array<{ mimeType: string; qualities: number[] }> {
  const qualitySteps = [ICON_DEFAULT_QUALITY, 0.7, 0.6, 0.5, 0.4];
  const candidates: Array<{ mimeType: string; qualities: number[] }> = [];
  const seen = new Set<string>();

  for (const mimeType of [preferredMimeType, fallbackMimeType]) {
    if (seen.has(mimeType)) continue;
    seen.add(mimeType);
    candidates.push({
      mimeType,
      qualities: mimeType === "image/png" ? [1] : qualitySteps,
    });
  }

  return candidates;
}

async function sourceToBlob(source: NormalizeIconSource): Promise<Blob | undefined> {
  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) return undefined;
    return await response.blob();
  }

  const blobSource = toBlobSource(source);
  return blobSource?.blob;
}

export async function normalizeIcon(
  source: NormalizeIconSource,
  options: NormalizeIconOptions = {},
): Promise<string | undefined> {
  if (!source) {
    return undefined;
  }

  const size = options.size || ICON_TARGET_SIZE;
  const maxBytes = options.maxBytes || ICON_MAX_BYTES;
  const preferredMimeType = options.preferredMimeType || ICON_PREFERRED_MIME;
  const fallbackMimeType = options.fallbackMimeType || ICON_FALLBACK_MIME;
  const initialQuality = options.quality ?? ICON_DEFAULT_QUALITY;
  let imageUrl = "";
  let objectUrl: string | null = null;

  try {
    const candidateMimes = buildMimeCandidates(preferredMimeType, fallbackMimeType).map((candidate) => ({
      mimeType: candidate.mimeType,
      qualities: candidate.mimeType === "image/png"
        ? [1]
        : [initialQuality, ...candidate.qualities.filter((quality) => quality !== initialQuality)],
    }));

    if (typeof document !== "undefined" && typeof URL !== "undefined") {
      if (typeof source === "string") {
        imageUrl = source.trim();
      } else {
        const blobSource = toBlobSource(source);
        if (!blobSource) return undefined;
        objectUrl = URL.createObjectURL(blobSource.blob);
        imageUrl = objectUrl;
      }

      if (!imageUrl) return undefined;

      const image = await loadImage(imageUrl);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return undefined;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");
      if (!context) return undefined;

      context.clearRect(0, 0, size, size);
      const scale = Math.min(size / width, size / height);
      const drawWidth = Math.max(1, Math.round(width * scale));
      const drawHeight = Math.max(1, Math.round(height * scale));
      const x = Math.floor((size - drawWidth) / 2);
      const y = Math.floor((size - drawHeight) / 2);
      context.drawImage(image, x, y, drawWidth, drawHeight);

      let smallest: string | undefined;
      let smallestBytes = Number.POSITIVE_INFINITY;

      for (const candidate of candidateMimes) {
        for (const quality of candidate.qualities) {
          const dataUrl = canvas.toDataURL(candidate.mimeType, quality);
          if (!dataUrl.startsWith(`data:${candidate.mimeType};base64,`)) {
            continue;
          }

          const bytes = estimateDataUrlBytes(dataUrl);
          if (bytes < smallestBytes) {
            smallestBytes = bytes;
            smallest = dataUrl;
          }
          if (bytes <= maxBytes) {
            return dataUrl;
          }
        }
      }

      return smallest && estimateDataUrlBytes(smallest) <= maxBytes ? smallest : undefined;
    }

    if (typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function") {
      const blob = await sourceToBlob(source);
      if (!blob) return undefined;

      const image = await createImageBitmap(blob);
      try {
        const width = image.width;
        const height = image.height;
        if (!width || !height) return undefined;

        const canvas = new OffscreenCanvas(size, size);
        const context = canvas.getContext("2d");
        if (!context) return undefined;

        context.clearRect(0, 0, size, size);
        const scale = Math.min(size / width, size / height);
        const drawWidth = Math.max(1, Math.round(width * scale));
        const drawHeight = Math.max(1, Math.round(height * scale));
        const x = Math.floor((size - drawWidth) / 2);
        const y = Math.floor((size - drawHeight) / 2);
        context.drawImage(image, x, y, drawWidth, drawHeight);

        let smallestBlob: Blob | undefined;
        let smallestBytes = Number.POSITIVE_INFINITY;

        for (const candidate of candidateMimes) {
          for (const quality of candidate.qualities) {
            const encoded = await canvas.convertToBlob({ type: candidate.mimeType, quality });
            if (encoded.type !== candidate.mimeType) {
              continue;
            }

            if (encoded.size < smallestBytes) {
              smallestBytes = encoded.size;
              smallestBlob = encoded;
            }
            if (encoded.size <= maxBytes) {
              return await blobToDataUrl(encoded);
            }
          }
        }

        return smallestBlob && smallestBlob.size <= maxBytes ? await blobToDataUrl(smallestBlob) : undefined;
      } finally {
        image.close();
      }
    }

    return undefined;
  } catch {
    return undefined;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
