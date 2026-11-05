/// <reference types="vite/client" />
/**
 * Server calls from the studio.
 *
 * The AI, Figma and GitHub features go through a small ProdOps server. A static
 * deployment (such as GitHub Pages) has no server, so it is built with
 * `VITE_STATIC_HOST=1`; there, these calls are never sent and the studio says
 * plainly what is and is not available instead of failing with a network error.
 */
export const STATIC_HOST = import.meta.env.VITE_STATIC_HOST === '1'

export const NO_SERVER_MESSAGE =
  'This hosted preview has no server, so AI drafting and Figma or GitHub imports are not available here. Editing files, the Orbit example, approvals and exports all work. Run ProdOps locally to use the AI.'

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (STATIC_HOST) return Promise.reject(new Error(NO_SERVER_MESSAGE))
  return fetch(input, init)
}
