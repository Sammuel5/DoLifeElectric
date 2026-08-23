/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    instrumentationHook: true,
  },

  // Tell webpack not to try bundling Node built-in modules when compiling
  // for the Edge runtime or server-worker targets. The DNS fix modules
  // (dns-preload.cjs) use require('dns') / require('https') at runtime and
  // are guarded by process.env.NEXT_RUNTIME === 'nodejs' — they are never
  // actually executed in Edge builds, but webpack still tries to resolve
  // the require() calls at build time. Marking them as webpack externals
  // converts the hard "Module not found" error into a harmless warning
  // (matching how dns-preload.cjs was already treated in previous builds).
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      // On the server (both Node.js runtime and Edge runtime builds),
      // Node built-ins should be treated as externals so webpack doesn't
      // try to bundle them. In the actual Node.js runtime they resolve
      // correctly; in Edge runtime the code path that uses them is guarded
      // by NEXT_RUNTIME === 'nodejs' and never executes.
      config.externals = config.externals || [];
      const nodeBuiltins = [
        'dns', 'dns/promises', 'https', 'http', 'tls', 'net', 'fs', 'path',
        'os', 'crypto', 'stream', 'zlib', 'child_process', 'cluster', 'dgram',
        'worker_threads', 'readline', 'url', 'util', 'events',
      ];
      config.externals.push(function ({ request }, callback) {
        if (nodeBuiltins.includes(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      });
    }
    return config;
  },

  // Allow Next/Image to optimize images from these external hosts
  // (e.g. if you ever host images on Cloudinary/S3/Atlas, or user avatars
  // from Google). Self-hosted /public/* and /uploads/* are automatic.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.google.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.digitaloceanspaces.com' },
      { protocol: 'https', hostname: '*.paymongo.com' },
    ],
    // Serve slightly smaller default sizes → less over-download on mobile
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1920],
    imageSizes: [32, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
  },

  // Response compression (gzip/br) — Vercel does this at the edge too, but
  // this helps when running locally and on non-Vercel hosts.
  compress: true,

  // Security + performance headers for static assets
  async headers() {
    return [
      {
        source: '/uploads/:all*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/dlelogo/:all*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/dark-texture.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/header-texture.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/uploads/videos/:all*',
        headers: [
          // Large video: cache but allow revalidation so updates are seen
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=31536000' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
