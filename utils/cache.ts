
// Versi aplikasi saat ini. Ubah string ini setiap kali Anda melakukan deploy besar
// agar aplikasi otomatis membersihkan cache di browser pengguna.
export const cacheManager = {
  initialize: () => {},
  clearSession: () => {}
};

/**
 * Robust image URL processor to automatically convert shared Google Drive links
 * to direct raw image URLs that can be used in <img> tags.
 */
export const getSafeImageUrl = (url: string | undefined | null): string | undefined => {
    if (!url) return undefined;
    let trimmed = url.trim();
    if (!trimmed) return undefined;

    // Google Drive share link -> direct URL
    const gdriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/);
    if (gdriveMatch) {
        return `https://drive.google.com/uc?id=${gdriveMatch[1]}`;
    }

    return trimmed;
};

