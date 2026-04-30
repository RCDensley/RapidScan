import type * as sql from 'mssql'
import type { InvocationContext } from '@azure/functions'

export type CategoryHandler = (
  pool: sql.ConnectionPool,
  projectId: string,
  ctx: InvocationContext
) => Promise<number>

const registry = new Map<string, CategoryHandler>()

export function registerHandler(category: string, handler: CategoryHandler): void {
  registry.set(category, handler)
}

export function getRegisteredHandlers(): Map<string, CategoryHandler> {
  return new Map(registry)
}
