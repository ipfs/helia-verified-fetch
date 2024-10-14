export class InvalidRangeError extends Error {
  static name = 'InvalidRangeError'

  constructor (message = 'Invalid range request') {
    super(message)
    this.name = 'InvalidRangeError'
  }
}

export class NoContentError extends Error {
  static name = 'NoContentError'

  constructor (message = 'No content found') {
    super(message)
    this.name = 'NoContentError'
  }
}

export class SubdomainNotSupportedError extends Error {
  static name = 'SubdomainNotSupportedError'

  constructor (message = 'Subdomain not supported') {
    super(message)
    this.name = 'SubdomainNotSupportedError'
  }
}
