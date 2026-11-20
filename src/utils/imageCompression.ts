const MAX_THUMBNAIL_DATA_URL_CHARS = 85_000;

export async function compressThumbnailDataUrl(
  sourceUrl: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const steps: Array<{ maxDim: number; quality: number }> = [
        { maxDim: 360, quality: 0.82 },
        { maxDim: 280, quality: 0.72 },
        { maxDim: 220, quality: 0.62 },
      ];

      let result: string | null = null;
      for (const step of steps) {
        let { width, height } = img;
        if (width > step.maxDim || height > step.maxDim) {
          if (width >= height) {
            height = Math.round((height * step.maxDim) / width);
            width = step.maxDim;
          } else {
            width = Math.round((width * step.maxDim) / height);
            height = step.maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", step.quality);
        result = dataUrl;
        if (dataUrl.length <= MAX_THUMBNAIL_DATA_URL_CHARS) {
          break;
        }
      }

      if (result && result.length <= 115_000) {
        resolve(result);
      } else {
        resolve(null);
      }
    };
    img.src = sourceUrl;
  });
}
