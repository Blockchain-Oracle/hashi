import type { z } from 'zod'

/** A provider answered with an error. `status` is the HTTP status; `body` is whatever it sent back. */
export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

/**
 * Fetch JSON and validate it. Provider APIs change without notice; a response that no longer matches what Hashi
 * relies on fails here, loudly, instead of showing a wrong amount on screen.
 */
export async function fetchJson<T extends z.ZodType>(
  provider: string,
  url: string,
  schema: T,
  init: {
    method?: 'GET' | 'POST'
    body?: unknown
    signal?: AbortSignal
    headers?: Record<string, string>
  } = {},
): Promise<z.infer<T>> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...init.headers,
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    ...(init.signal ? { signal: init.signal } : {}),
  })
  const text = await response.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    throw new ProviderError(provider, `${provider} sent a response that is not JSON`, response.status, text)
  }
  if (!response.ok) {
    throw new ProviderError(
      provider,
      errorMessage(json) ?? `${provider} answered ${response.status}`,
      response.status,
      json,
    )
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new ProviderError(
      provider,
      `${provider} sent an unexpected response: ${parsed.error.message}`,
      response.status,
      json,
    )
  }
  return parsed.data
}

function errorMessage(json: unknown): string | undefined {
  if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>
    for (const key of ['message', 'error', 'detail']) {
      const value = record[key]
      if (typeof value === 'string' && value) return value
    }
  }
  return undefined
}
