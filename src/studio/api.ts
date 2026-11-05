/// <reference types="vite/client" />
/**
 * Server calls from the studio.
 *
 * The AI, Figma and GitHub features go through a small ProdOps server. A static
 * deployment (such as GitHub Pages) has no server, so it is built with
 * `VITE_STATIC_HOST=1`; there, these calls are never sent and the studio says
 * plainly what is and is not available instead of failing with a network error.
 */
/** `import.meta.env` is absent when the source runs under Node (tests), so read it defensively. */
const env: Record<string, string | undefined> = (import.meta as { env?: Record<string, string | undefined> }).env ?? {}

export const STATIC_HOST = env.VITE_STATIC_HOST === '1'

export const NO_SERVER_MESSAGE =
  'This hosted preview has no server, so AI drafting and Figma or GitHub imports are not available here. Instant draft, editing, readiness checks, versions, approvals and exports all work.'

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (STATIC_HOST) return Promise.reject(new Error(NO_SERVER_MESSAGE))
  return fetch(input, init)
}

/** URL of a file in `public/`, correct under any deployment path. */
export const asset = (path: string) => `${env.BASE_URL ?? '/'}${path}`
