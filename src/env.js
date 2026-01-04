export const readEnv = (key) => {
  if (typeof window !== "undefined") {
    if (window.ENV?.[key]) return window.ENV[key];
    if (window[key]) return window[key];
    const meta = document.querySelector(`meta[name="${key}"]`);
    if (meta?.content) return meta.content;
  }

  if (typeof globalThis !== "undefined" && globalThis.process?.env?.[key]) {
    return globalThis.process.env[key];
  }

  return null;
};

export const getEnv = (key, fallback = null) => readEnv(key) ?? fallback;
