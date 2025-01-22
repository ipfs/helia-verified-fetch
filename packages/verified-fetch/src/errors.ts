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

export class PluginError extends Error {
  public name = 'PluginError'
  public code: string
  public fatal: boolean
  public details?: Record<string, any>

  constructor (code: string, message: string, options?: {
    fatal?: boolean
    details?: Record<string, any>
  }) {
    super(message)
    this.code = code
    this.fatal = options?.fatal ?? false
    this.details = options?.details
  }
}

export class FatalError extends PluginError {
  public name = 'FatalError'

  constructor (code: string, message: string, details?: Record<string, any>) {
    super(code, message, { fatal: true, details })
    this.name = 'FatalError'
  }
}
