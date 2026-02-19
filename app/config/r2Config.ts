// app/config/r2Config.ts

const R2_CONFIG = {
  // Public URL dari R2 bucket (bisa custom domain atau r2.dev URL)
  publicUrl: 'https://young-snow-d18a.nutrisight-innovilage.workers.dev', 
  // atau: 'https://pub-xxxxx.r2.dev'
  
  bucket: 'food-images',
  defaultImage: 'foto-default.png', // Gambar default kalau imageKey null/undefined
};

/**
 * Construct full R2 URL dari image key
 * Key bisa berupa: "nasi-goreng.jpg" atau "menu/nasi-goreng.jpg"
 */
export const getR2ImageUrl = (imageKey: string | null | undefined): string => {
  if (!imageKey) {
    return `${R2_CONFIG.publicUrl}/${R2_CONFIG.defaultImage}`;
  }

  // Kalau sudah full URL (migrasi/fallback), return as-is
  if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) {
    return imageKey;
  }

  return `${R2_CONFIG.publicUrl}/${imageKey}`;
};

export default R2_CONFIG;