/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/products/:path*',
        destination: '/api/products/:path*',
      },
      {
        source: '/api/categories/:path*',
        destination: '/api/categories/:path*',
      },
      {
        source: '/api/inventory/:path*',
        destination: '/api/inventory/:path*',
      },
      {
        source: '/api/pricing/:path*',
        destination: '/api/pricing/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;