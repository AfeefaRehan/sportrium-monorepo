export function getApiBase() {
  const base = import.meta.env.VITE_API_URL;
  if (!base) {
    throw new Error(
      'VITE_API_URL is not set. Create user-frontend/.env with VITE_API_URL=http://localhost:5000/api'
    );
  }
  // Normalize: remove trailing slash
  return base.replace(/\/+$/, '');
}
