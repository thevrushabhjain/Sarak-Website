import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = { distDir: '.next-sarak', outputFileTracingRoot: projectRoot };
export default nextConfig;
