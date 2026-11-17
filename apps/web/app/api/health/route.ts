/**
 * The container's health check (Coolify probes it): the server is up and answering. It calls no provider, so a slow
 * bridge never takes the site out of rotation; the swap screen's status popover reports the services themselves.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ ok: true })
}
