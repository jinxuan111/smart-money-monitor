/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 尝试告诉 Next.js 使用 pages router（但有 app/ 目录时通常无效）
  experimental: {
    // 通常没用
  }
}

module.exports = nextConfig