/**
 * we need to emulate signal handling (blockBrokers/dnsResolvers/etc should handle abort signals too)
 * this is a simplified version of what libs we depend on should do, and the
 * tests in this file verify how verified-fetch would handle the failure
 */
export async function getAbortablePromise <T> (signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('timeout while resolving'))
    }, 5000)

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new Error('aborted'))
    })
  })
}
