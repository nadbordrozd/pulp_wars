import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import type { Ruleset6AcceptedImageResolver } from "./board-renderer-v6";

interface LoadedImageV6 {
  readonly image: HTMLImageElement;
  status: "LOADING" | "READY" | "ERROR";
}

/**
 * Browser-only lazy image boundary for the pure ruleset-6 renderer. A loading
 * or failed accepted raster resolves to null, causing the deterministic
 * code-native loading fallback to draw until the next requested redraw.
 */
export function createRuleset6AcceptedImageResolver(
  documentRoot: Document,
  requestRedraw: () => void = () => {},
): Ruleset6AcceptedImageResolver {
  const images = new Map<string, LoadedImageV6>();
  return {
    resolve(assetId): CanvasImageSource | null {
      const url = ACCEPTED_ART_URLS[assetId];
      if (url === undefined) return null;
      let loaded = images.get(assetId);
      if (loaded === undefined) {
        const image = documentRoot.createElement("img");
        image.alt = "";
        image.decoding = "async";
        loaded = { image, status: "LOADING" };
        images.set(assetId, loaded);
        image.addEventListener("load", () => {
          const current = images.get(assetId);
          if (current === undefined) return;
          current.status = "READY";
          requestRedraw();
        });
        image.addEventListener("error", () => {
          const current = images.get(assetId);
          if (current === undefined) return;
          current.status = "ERROR";
          requestRedraw();
        });
        image.src = url;
      }
      return loaded.status === "READY" ? loaded.image : null;
    },
  };
}
