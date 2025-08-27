declare module 'whois' {
  interface WhoisOptions {
    server?: string
    follow?: number
    timeout?: number
    verbose?: boolean
    bind?: string
    proxy?: {
      host: string
      port: number
      type: number
    }
  }

  interface WhoisCallback {
    (error: Error | null, data?: string): void
  }

  function lookup(
    domain: string,
    options: WhoisOptions,
    callback: WhoisCallback
  ): void

  function lookup(
    domain: string,
    callback: WhoisCallback
  ): void

  export = {
    lookup: lookup
  }
}