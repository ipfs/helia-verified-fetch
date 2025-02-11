import type { FatalPluginErrorOptions, PluginErrorOptions } from './types.js'

/**
 * If a plugin encounters an error, it should throw an instance of this class.
 */
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

/**
 * If a plugin encounters a fatal error and verified-fetch should not continue processing the request, it should throw
 * an instance of this class.
 *
 * Note that you should be very careful when throwing a `PluginFatalError`, as it will stop the request from being
 * processed further. If you do not have a response to return to the client, you should consider throwing a
 * `PluginError` instead.
 */
export class PluginFatalError extends PluginError {
  public name = 'PluginFatalError'

  constructor (code: string, message: string, options: FatalPluginErrorOptions) {
    super(code, message, { ...options, fatal: true })
    this.name = 'PluginFatalError'
  }
}
