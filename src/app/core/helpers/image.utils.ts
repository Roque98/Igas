// ============================================================================
// Image Utilities
// ============================================================================
// Funciones para comprimir y redimensionar imágenes antes de subirlas
// ============================================================================

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;  // 0 to 1
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.8,
  mimeType: 'image/jpeg'
};

/**
 * Comprime y redimensiona una imagen manteniendo la proporción
 * @param file Archivo de imagen original
 * @param options Opciones de compresión
 * @returns Promise con el archivo comprimido
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Verificar que es una imagen
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calcular nuevas dimensiones manteniendo proporción
          const { width, height } = calculateDimensions(
            img.width,
            img.height,
            opts.maxWidth!,
            opts.maxHeight!
          );

          // Crear canvas para redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }

              // Crear nuevo File con el blob comprimido
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, '.jpg'),
                {
                  type: opts.mimeType,
                  lastModified: Date.now()
                }
              );

              resolve(compressedFile);
            },
            opts.mimeType,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calcula las dimensiones manteniendo la proporción
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Si la imagen ya es más pequeña que los máximos, no redimensionar
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // Calcular ratio
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

/**
 * Opciones predefinidas para diferentes usos
 */
export const IMAGE_PRESETS = {
  avatar: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.85,
    mimeType: 'image/jpeg' as const
  },
  thumbnail: {
    maxWidth: 150,
    maxHeight: 150,
    quality: 0.7,
    mimeType: 'image/jpeg' as const
  },
  evidencia: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    mimeType: 'image/jpeg' as const
  }
};
