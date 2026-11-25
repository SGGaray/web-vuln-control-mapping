import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Static export: `next build` writes the whole site to out/, which
  // Cloudflare serves as Workers static assets with no Worker code. Response
  // headers live in public/_headers (copied to out/_headers), and
  // scripts/apply-csp.mjs then adds the hashes of this build's inline scripts
  // to its Content-Security-Policy. Next.js headers(), redirects(), rewrites,
  // middleware and route handlers do not run in a static export.
  output: "export",
};

export default nextConfig;
