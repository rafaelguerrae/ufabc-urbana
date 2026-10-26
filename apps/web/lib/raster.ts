export interface RasterInfo {
  bounds: { west: number; south: number; east: number; north: number };
  width: number;
  height: number;
  lst: { encoding: [number, number]; scale: [number, number]; unit: string };
  ndvi: { encoding: [number, number]; scale: [number, number]; unit: string };
  period: [string, string];
  scenes: number;
}

export interface RasterSample {
  lst: number;
  ndvi: number;
  /** Pixels with data inside the sampling window (max 9). */
  pixels: number;
}

export interface RasterData {
  info: RasterInfo;
  sample: (lng: number, lat: number) => RasterSample | null;
}

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${url}`));
    img.src = url;
  });
}

/** Loads raster.json and the value image, and returns a point-sampling function. */
export async function loadRaster(): Promise<RasterData> {
  const info = (await (await fetch("/data/raster/raster.json")).json()) as RasterInfo;
  const img = await loadImage("/data/raster/values.png");
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  const { west, south, east, north } = info.bounds;
  const y0 = mercatorY(north);
  const y1 = mercatorY(south);
  const [lstMin, lstMax] = info.lst.encoding;
  const [ndviMin, ndviMax] = info.ndvi.encoding;

  const sample = (lng: number, lat: number): RasterSample | null => {
    if (lng < west || lng > east || lat < south || lat > north) return null;
    const cx = Math.floor(((lng - west) / (east - west)) * info.width);
    const cy = Math.floor(((y0 - mercatorY(lat)) / (y0 - y1)) * info.height);
    let lst = 0;
    let ndvi = 0;
    let pixels = 0;
    // 3x3 window (about 90 m), because Landsat thermal pixels are about 100 m wide.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
        const i = (y * info.width + x) * 4;
        if (data[i + 3] === 0) continue;
        lst += lstMin + (data[i]! / 255) * (lstMax - lstMin);
        ndvi += ndviMin + (data[i + 1]! / 255) * (ndviMax - ndviMin);
        pixels++;
      }
    }
    return pixels === 0 ? null : { lst: lst / pixels, ndvi: ndvi / pixels, pixels };
  };

  return { info, sample };
}
