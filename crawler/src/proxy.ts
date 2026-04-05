import { ProxyAgent, setGlobalDispatcher } from 'undici'

/**
 * If a proxy is configured (via http_proxy / https_proxy env vars),
 * patch Node.js's global fetch dispatcher so all outbound requests go through it.
 * This is needed because Node.js built-in fetch does not read proxy env vars natively.
 * No-op in GitHub Actions where no proxy is needed.
 */
export function setupProxy() {
  const proxyUrl =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy

  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
    console.log(`[proxy] Using proxy: ${proxyUrl}`)
  }
}
