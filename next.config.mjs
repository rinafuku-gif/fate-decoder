/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['sweph', 'msedge-tts'],
}

export default nextConfig
