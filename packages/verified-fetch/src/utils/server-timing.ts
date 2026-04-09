export class ServerTiming {
  private headers: string[]

  constructor () {
    this.headers = []
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
      const duration = endTime - startTime

      this.add(name, description, duration)
    }
  }

  add (name: string, description: string, ms: number): void {
    this.headers.push(`${name};dur=${Math.round(ms)}${description === '' ? '' : `;desc="${description}"`}`)
  }
}
