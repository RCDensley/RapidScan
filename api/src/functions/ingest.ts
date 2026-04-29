import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import * as sql from 'mssql'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Readable } from 'stream'
import Busboy from 'busboy'
import * as unzipper from 'unzipper'
import { getPool } from '../lib/db'

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_ENTRY_BYTES  = 1024 * 1024

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', '__pycache__', '.svn', 'vendor',
])

const EXCLUDED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff', '.avif', '.heic',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.mp3', '.wav', '.ogg', '.avi', '.mov', '.mkv', '.flac', '.aac',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.pyc', '.class', '.pdb',
  '.zip', '.tar', '.gz', '.bz2', '.rar', '.7z', '.xz',
  '.pdf', '.docx', '.xlsx', '.pptx', '.doc', '.xls',
  '.map',
])

const EXCLUDED_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'composer.lock', 'Gemfile.lock', 'poetry.lock', 'Pipfile.lock',
])

function isExcluded(relativePath: string, sizeBytes: number): boolean {
  if (sizeBytes > MAX_ENTRY_BYTES) return true

  const parts = relativePath.split('/')
  const filename = parts[parts.length - 1]

  for (const dir of parts.slice(0, -1)) {
    if (EXCLUDED_DIRS.has(dir)) return true
  }

  if (filename.startsWith('.env')) return true
  if (EXCLUDED_FILENAMES.has(filename)) return true

  return EXCLUDED_EXTENSIONS.has(path.extname(filename).toLowerCase())
}

function walkDir(dir: string, rootDir: string): Array<{ path: string; extension: string; sizeBytes: number }> {
  const manifest: Array<{ path: string; extension: string; sizeBytes: number }> = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      manifest.push(...walkDir(fullPath, rootDir))
    } else if (entry.isFile()) {
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/')
      const { size } = fs.statSync(fullPath)
      if (!isExcluded(relativePath, size)) {
        manifest.push({
          path: relativePath,
          extension: path.extname(entry.name).toLowerCase() || '',
          sizeBytes: size,
        })
      }
    }
  }

  return manifest
}

async function readFileFromMultipart(req: HttpRequest): Promise<Buffer> {
  const rawBody = Buffer.from(await req.arrayBuffer())

  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  return new Promise<Buffer>((resolve, reject) => {
    const bb = Busboy({ headers, limits: { fileSize: MAX_UPLOAD_BYTES + 1 } })
    let fileBuffer: Buffer | null = null
    let sizeLimitHit = false

    bb.on('file', (field, file) => {
      if (field !== 'file') { file.resume(); return }
      const chunks: Buffer[] = []
      file.on('data', (chunk: Buffer) => chunks.push(chunk))
      file.on('limit', () => { sizeLimitHit = true; file.resume() })
      file.on('close', () => { if (!sizeLimitHit) fileBuffer = Buffer.concat(chunks) })
    })

    bb.on('close', () => {
      if (sizeLimitHit) return reject({ code: 413, message: 'File exceeds the 50 MB limit' })
      if (!fileBuffer) return reject({ code: 400, message: 'No file field found in the request' })
      resolve(fileBuffer)
    })

    bb.on('error', (err: Error) => reject(err))

    Readable.from(rawBody).pipe(bb)
  })
}

async function ingestZip(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id

  const pool = await getPool()
  const projectRow = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT input_type FROM projects WHERE project_id = @id')

  if (projectRow.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }
  if (projectRow.recordset[0].input_type !== 'zip') {
    return { status: 400, jsonBody: { error: 'Project is not a zip project' } }
  }

  let zipBuffer: Buffer
  try {
    zipBuffer = await readFileFromMultipart(req)
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string }
    return { status: e.code ?? 400, jsonBody: { error: e.message ?? 'Invalid upload' } }
  }

  // Stable per-project temp dir — persists so the scan engine can read files after ingest
  const tempDir = path.join(os.tmpdir(), 'rapidscan', id)
  fs.rmSync(tempDir, { recursive: true, force: true })
  fs.mkdirSync(tempDir, { recursive: true })

  const zipPath = path.join(tempDir, '_upload.zip')
  fs.writeFileSync(zipPath, zipBuffer)

  const directory = await unzipper.Open.file(zipPath)
  for (const file of directory.files) {
    if (file.type !== 'File') continue
    const outPath = path.join(tempDir, file.path)
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
    await new Promise<void>((resolve, reject) => {
      file.stream().pipe(fs.createWriteStream(outPath))
        .on('finish', resolve)
        .on('error', reject)
    })
  }

  fs.unlinkSync(zipPath)

  const manifest = walkDir(tempDir, tempDir)

  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    await new sql.Request(tx)
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM file_manifests WHERE project_id = @id')

    for (const entry of manifest) {
      await new sql.Request(tx)
        .input('project_id', sql.UniqueIdentifier, id)
        .input('file_path', sql.NVarChar(1000), entry.path)
        .input('extension', sql.NVarChar(50), entry.extension || null)
        .input('size_bytes', sql.BigInt, entry.sizeBytes)
        .query(`
          INSERT INTO file_manifests (project_id, file_path, extension, size_bytes)
          VALUES (@project_id, @file_path, @extension, @size_bytes)
        `)
    }

    await new sql.Request(tx)
      .input('id', sql.UniqueIdentifier, id)
      .input('sourcePath', sql.NVarChar(1000), tempDir)
      .query('UPDATE projects SET source_path = @sourcePath WHERE project_id = @id')

    await tx.commit()
  } catch (dbErr) {
    await tx.rollback()
    throw dbErr
  }

  return { status: 200, jsonBody: { files: manifest, count: manifest.length } }
}

app.http('ingestZip', {
  methods: ['POST'],
  route: 'projects/{id}/ingest/zip',
  authLevel: 'anonymous',
  handler: ingestZip,
})

async function ingestLocal(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { status: 400, jsonBody: { error: 'Request body must be JSON' } }
  }

  const directoryPath = (body as Record<string, unknown>)?.directoryPath
  if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
    return { status: 400, jsonBody: { error: 'directoryPath is required' } }
  }

  const pool = await getPool()
  const projectRow = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query('SELECT input_type FROM projects WHERE project_id = @id')

  if (projectRow.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }
  if (projectRow.recordset[0].input_type !== 'local') {
    return { status: 400, jsonBody: { error: 'Project is not a local project' } }
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(directoryPath)
  } catch {
    return { status: 400, jsonBody: { error: `Path does not exist or is not accessible: ${directoryPath}` } }
  }

  if (!stat.isDirectory()) {
    return { status: 400, jsonBody: { error: `Path is not a directory: ${directoryPath}` } }
  }

  const manifest = walkDir(directoryPath, directoryPath)

  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    await new sql.Request(tx)
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM file_manifests WHERE project_id = @id')

    for (const entry of manifest) {
      await new sql.Request(tx)
        .input('project_id', sql.UniqueIdentifier, id)
        .input('file_path', sql.NVarChar(1000), entry.path)
        .input('extension', sql.NVarChar(50), entry.extension || null)
        .input('size_bytes', sql.BigInt, entry.sizeBytes)
        .query(`
          INSERT INTO file_manifests (project_id, file_path, extension, size_bytes)
          VALUES (@project_id, @file_path, @extension, @size_bytes)
        `)
    }

    await new sql.Request(tx)
      .input('id', sql.UniqueIdentifier, id)
      .input('sourcePath', sql.NVarChar(1000), directoryPath)
      .query('UPDATE projects SET source_path = @sourcePath WHERE project_id = @id')

    await tx.commit()
  } catch (dbErr) {
    await tx.rollback()
    throw dbErr
  }

  return { status: 200, jsonBody: { files: manifest, count: manifest.length } }
}

app.http('ingestLocal', {
  methods: ['POST'],
  route: 'projects/{id}/ingest/local',
  authLevel: 'anonymous',
  handler: ingestLocal,
})
