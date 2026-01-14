type PixelCrop = { x: number; y: number; width: number; height: number };

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // important if imageSrc is remote
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

export default async function getCroppedImg(
  imageSrc: string,
  crop: PixelCrop,
  fileName = "banner.png"
): Promise<File> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get canvas context");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas is empty"))), "image/png");
  });

  return new File([blob], fileName, { type: "image/png" });
}
