import type { NextConfig } from 'next'
import { MAX_IMPORT_FILE_SIZE_BYTES } from './src/lib/config'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    proxyClientMaxBodySize: MAX_IMPORT_FILE_SIZE_BYTES,
    serverActions: {
      bodySizeLimit: MAX_IMPORT_FILE_SIZE_BYTES,
    },
    useTypeScriptCli: true,
  },
}

export default nextConfig
