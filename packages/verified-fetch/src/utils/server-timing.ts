export interface ServerTimingSuccess<T> {
  error: null
  result: T
  header: string
}
export interface ServerTimingError {
  result: null
  error: Error
  header: string
}
export type ServerTimingResult<T> = ServerTimingSuccess<T> | ServerTimingError

export async function serverTiming<T> (
  name: string,
  description: string,
  fn: () => Promise<T>
): Promise<ServerTimingResult<T>> {
  const startTime = performance.now()

  try {
    const result = await fn() // Execute the function
    const endTime = performance.now()

    const duration = (endTime - startTime).toFixed(1) // Duration in milliseconds

    // Create the Server-Timing header string
    const header = `${name};dur=${duration};desc="${description}"`
    return { result, header, error: null }
  } catch (error: any) {
    const endTime = performance.now()
    const duration = (endTime - startTime).toFixed(1)

    // Still return a timing header even on error
    const header = `${name};dur=${duration};desc="${description}"`
    return { result: null, error, header } // Pass error with timing info
  }
}
