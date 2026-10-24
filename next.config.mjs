/** @type {import('next').NextConfig} */
if (process.env.NODE_ENV !== 'production') {
  // En desarrollo local (Windows), antivirus como Avast interceptan conexiones SSL
  // generando 'fetch failed' (UNABLE_TO_VERIFY_LEAF_SIGNATURE) en peticiones a Supabase y APIs.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig = {};

export default nextConfig;
