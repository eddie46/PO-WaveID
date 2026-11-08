/**
 * Compresses an image file client-side into a lightweight base64 DataURL
 * guaranteed to be < 42,000 characters so it fits inside a Google Sheets cell (50,000 char limit).
 */
export async function compressImage(
  file: File,
  maxDimension = 750,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const renderAt = (dim: number, q: number): string => {
          let width = img.width;
          let height = img.height;

          if (width > dim || height > dim) {
            if (width > height) {
              height = Math.round((height * dim) / width);
              width = dim;
            } else {
              width = Math.round((width * dim) / height);
              height = dim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas 2d context');
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', q);
        };

        try {
          let dataUrl = renderAt(maxDimension, quality);
          let currentDim = maxDimension;
          let currentQ = quality;

          // Step down until it fits comfortably in a Google Sheets cell (< 42,000 chars)
          while (dataUrl.length > 42000 && currentDim >= 360) {
            currentDim = Math.round(currentDim * 0.82);
            currentQ = Math.max(0.5, currentQ - 0.08);
            dataUrl = renderAt(currentDim, currentQ);
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
