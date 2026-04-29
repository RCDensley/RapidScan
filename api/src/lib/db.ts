import * as sql from 'mssql'

let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool
  }

  const connectionString = process.env.RAPIDSCAN_SQL_CONNECTION_STRING
  if (!connectionString) {
    throw new Error('RAPIDSCAN_SQL_CONNECTION_STRING is not set')
  }

  pool = await sql.connect(connectionString)
  return pool
}
