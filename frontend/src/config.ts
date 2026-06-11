const raw = import.meta.env.VITE_API_URL?.trim() ?? '';

export const API_BASE = raw.replace(/\/$/, '') || '/api';
