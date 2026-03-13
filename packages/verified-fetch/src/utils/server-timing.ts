export class ServerTiming {
  private headers: string[]
  private precision: number

  constructor () {
    this.headers = []
    this.precision = 3
  }

  getHeader (): string {
    return this.headers.join(',')
  }

  async time <T> (name: string, description: string, promise: Promise<T>): Promise<T> {
    const startTime = performance.now()

    try {
      return await promise // Execute the function
    } finally {
      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(this.precision) // Duration in milliseconds

      this.add(name, description, duration)
    }
  }

  add (name: string, description: string, duration: number | string): void {
    this.headers.push(`${name};dur=${Number(duration).toFixed(this.precision)};desc="${description}"`)
  }
}
