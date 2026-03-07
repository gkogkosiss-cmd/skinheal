export const MAX_IMAGE_COUNT = 5;
export const MAX_IMAGE_SIZE_MB = 12;

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export type PreparedImage = {
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
  fingerprint: string;
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read selected image."));
    reader.readAsDataURL(blob);
  });

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode this image file."));
    img.src = url;
  });

const convertImageToJpeg = async (file: File): Promise<Blob> => {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(sourceUrl);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is not available in this browser.");

    context.drawImage(img, 0, 0, width, height);

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });

    if (!jpegBlob) throw new Error("Failed to process image.");

    return jpegBlob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
};

const getExtension = (name: string) => {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
};

const baseName = (name: string) => {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(0, index) : name;
};

export const getFileFingerprint = (file: File) => `${file.name}-${file.size}-${file.lastModified}-${file.type}`;

export const validateImageFile = (file: File): string | null => {
  // Camera-captured files on mobile can have generic names (e.g. "image.jpg") or
  // unusual MIME types. Be lenient: if it starts with "image/" accept it.
  const extension = getExtension(file.name);
  const isImageMime = file.type ? file.type.startsWith("image/") : false;
  const hasSupportedExtension = extension ? SUPPORTED_EXTENSIONS.includes(extension) : false;

  // Accept if MIME says image OR extension is a known image type
  // Camera captures often have correct MIME but generic filenames
  if (!isImageMime && !hasSupportedExtension) {
    // If no MIME and no extension, still reject
    if (!file.type && !extension) {
      return "Please upload JPG, PNG, WEBP, or HEIC images.";
    }
    // If MIME is set but not image/*
    if (file.type && !isImageMime) {
      return "Please upload JPG, PNG, WEBP, or HEIC images.";
    }
    // If extension is set but not recognized and no image MIME
    if (extension && !hasSupportedExtension && !isImageMime) {
      return "Please upload JPG, PNG, WEBP, or HEIC images.";
    }
  }

  const maxSize = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSize) {
    return `Image is too large. Please use files under ${MAX_IMAGE_SIZE_MB}MB.`;
  }

  return null;
};

export const prepareImageForAnalysis = async (file: File): Promise<PreparedImage> => {
  try {
    const processedBlob = await convertImageToJpeg(file);
    const processedName = `${baseName(file.name)}.jpg`;
    const processedFile = new File([processedBlob], processedName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    const dataUrl = await readBlobAsDataUrl(processedBlob);
    const base64 = dataUrl.split(",")[1] || "";
    const previewUrl = URL.createObjectURL(processedFile);

    if (!base64) {
      URL.revokeObjectURL(previewUrl);
      throw new Error("Failed to prepare image for analysis.");
    }

    return {
      file: processedFile,
      base64,
      mimeType: "image/jpeg",
      previewUrl,
      fingerprint: getFileFingerprint(processedFile),
    };
  } catch {
    const dataUrl = await readBlobAsDataUrl(file);
    const base64 = dataUrl.split(",")[1] || "";
    const previewUrl = URL.createObjectURL(file);

    if (!base64) {
      URL.revokeObjectURL(previewUrl);
      throw new Error("Could not decode this image. Try selecting a clearer JPG or PNG photo.");
    }

    return {
      file,
      base64,
      mimeType: file.type && file.type.startsWith("image/") ? file.type : "image/jpeg",
      previewUrl,
      fingerprint: getFileFingerprint(file),
    };
  }
};
