/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@parrot/db"],
};

module.exports = nextConfig;
