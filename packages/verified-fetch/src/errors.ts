export class InvalidRangeError extends Error {
  static name = 'InvalidRangeError'

  constructor (message = 'Invalid range request') {
    super(message)
    this.name = 'InvalidRangeError'
  }
}
