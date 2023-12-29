/**
 * @extends Error
 */
export class OaiPmhError extends Error {
  public code: string;
  constructor (message: string, code: string) {
    super(message)
    this.name = this.constructor.name
    this.message = message
    this.code = code
    // @ts-ignore
    Error.captureStackTrace(this, this.constructor.name)
  }
}
