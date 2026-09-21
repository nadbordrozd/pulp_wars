export interface ReviewSize {
  readonly width: number;
  readonly height: number;
}

export interface ReviewBounds extends ReviewSize {
  readonly left: number;
  readonly top: number;
}

export interface IndividualTerrainImages {
  readonly id: string;
  readonly source: ReviewSize;
  readonly native: ReviewSize;
  readonly enlarged: ReviewSize;
}

/** Keep every untrimmed image, its checker and its label inside one cell. */
export function individualTerrainLayout(
  images: readonly IndividualTerrainImages[],
  labelHeight: number,
) {
  const columns = 4;
  const gap = 8;
  const padding = 8;
  const panelSize = (kind: "source" | "native" | "enlarged") => ({
    width: Math.max(...images.map((image) => image[kind].width)) + padding * 2,
    height:
      Math.max(...images.map((image) => image[kind].height)) + padding * 2,
  });
  const source = panelSize("source");
  const native = panelSize("native");
  const enlarged = panelSize("enlarged");
  const cell = {
    width:
      Math.max(source.width + gap + native.width, enlarged.width) + gap * 2,
    height:
      labelHeight +
      Math.max(source.height, native.height) +
      enlarged.height +
      gap * 4,
  };
  const panel = (
    size: ReviewSize,
    image: ReviewSize,
    left: number,
    top: number,
  ) => ({
    bounds: { left, top, ...size },
    image: {
      left: left + Math.floor((size.width - image.width) / 2),
      top: top + Math.floor((size.height - image.height) / 2),
      width: image.width,
      height: image.height,
    },
  });
  return {
    width: cell.width * columns,
    height: cell.height * Math.ceil(images.length / columns),
    cell,
    panels: images.map((image, index) => {
      const left = (index % columns) * cell.width;
      const top = Math.floor(index / columns) * cell.height;
      const upperTop = top + gap + labelHeight + gap;
      return {
        id: image.id,
        bounds: { left, top, ...cell },
        label: { left, top: top + gap, width: cell.width, height: labelHeight },
        source: panel(source, image.source, left + gap, upperTop),
        native: panel(
          native,
          image.native,
          left + gap + source.width + gap,
          upperTop,
        ),
        enlarged: panel(
          enlarged,
          image.enlarged,
          left + Math.floor((cell.width - enlarged.width) / 2),
          upperTop + Math.max(source.height, native.height) + gap,
        ),
      };
    }),
  };
}
