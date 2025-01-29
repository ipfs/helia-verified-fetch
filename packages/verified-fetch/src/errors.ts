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

export interface PluginErrorOptions {
  fatal?: boolean
  details?: Record<string, any>
  response?: Response
}

export interface FatalPluginErrorOptions extends PluginErrorOptions {
  response: Response
}

export class PluginError extends Error {
  public name = 'PluginError'
  public code: string
  public fatal: boolean
  public details?: Record<string, any>
  public response?: any

  constructor (code: string, message: string, options?: PluginErrorOptions) {
    super(message)
    this.code = code
    this.fatal = options?.fatal ?? false
    this.details = options?.details
    this.response = options?.response
  }
}

export class PluginFatalError extends PluginError {
  public name = 'PluginFatalError'

  constructor (code: string, message: string, options: FatalPluginErrorOptions) {
    super(code, message, { ...options, fatal: true })
    this.name = 'PluginFatalError'
  }
}
