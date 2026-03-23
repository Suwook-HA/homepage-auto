/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // YouTube thumbnails
      { protocol: "https", hostname: "i.ytimg.com" },
      // Google Photos / Google user content
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "photos.googleapis.com" },
      // GitHub avatars
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // staticPhotoUrls: admin may configure photos from various HTTPS sources.
      // Add specific hostnames here as needed instead of using the wildcard below.
      // { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
