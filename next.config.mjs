const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        port: '',
      },
    ],
  },
  devIndicators: {
    appIsrStatus: false,
  },
  compress: false
};

export default nextConfig;