/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build --> Error: Can't resolve 'fs'
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
        "node:dns": false,
        "node:http": false,
        "node:https": false,
        "node:stream": false,
        "node:buffer": false,
        "node:util": false,
        "node:url": false,
        "node:zlib": false,
        "node:querystring": false,
        dns: false,
        http: false,
        https: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        zlib: false,
        querystring: false,
      }
    }

    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
  },
}

module.exports = nextConfig 