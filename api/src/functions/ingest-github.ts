import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import * as sql from 'mssql'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Octokit } from '@octokit/rest'
import { getPool } from '../lib/db'

const MAX_ENTRY_BYTES = 1024 * 1024

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

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const httpsMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }
  const shortMatch = repoUrl.match(/^([^/]+)\/([^/]+)$/)
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] }
  return null
}

async function ingestGithub(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id

  const pool = await getPool()
  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`
      SELECT p.input_type, p.repo_url, ps.github_pat
      FROM projects p
      LEFT JOIN project_settings ps ON ps.project_id = p.project_id
      WHERE p.project_id = @id
    `)

  if (result.recordset.length === 0) {
    return { status: 404, jsonBody: { error: 'Project not found' } }
  }

  const row = result.recordset[0]

  if (row.input_type !== 'github') {
    return { status: 400, jsonBody: { error: 'Project is not a GitHub project' } }
  }

  if (!row.github_pat) {
    return {
      status: 400,
      jsonBody: {
        error: 'No GitHub PAT configured. Add a personal access token in project Settings to enable GitHub ingestion.',
      },
    }
  }

  if (!row.repo_url) {
    return { status: 400, jsonBody: { error: 'No repo URL configured for this project' } }
  }

  const parsed = parseRepoUrl(row.repo_url)
  if (!parsed) {
    return { status: 400, jsonBody: { error: `Could not parse repo URL: ${row.repo_url}` } }
  }

  const { owner, repo } = parsed
  const octokit = new Octokit({ auth: row.github_pat })

  let defaultBranch: string
  let treeSha: string
  try {
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
    defaultBranch = repoData.default_branch
    const { data: branchData } = await octokit.rest.repos.getBranch({ owner, repo, branch: defaultBranch })
    treeSha = branchData.commit.commit.tree.sha
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e.status === 401 || e.status === 403) {
      return { status: 400, jsonBody: { error: 'GitHub PAT is invalid or lacks required permissions (needs repo scope).' } }
    }
    if (e.status === 404) {
      return { status: 400, jsonBody: { error: `Repository not found: ${owner}/${repo}` } }
    }
    throw err
  }

  const { data: treeData } = await octokit.rest.git.getTree({ owner, repo, tree_sha: treeSha, recursive: '1' })

  if (treeData.truncated) {
    ctx.log(`Warning: git tree truncated for ${owner}/${repo} — large repo, some files may be missing`)
  }

  const candidates = (treeData.tree ?? []).filter(
    entry => entry.type === 'blob' && entry.path && !isExcluded(entry.path, entry.size ?? 0)
  )

  // Stable per-project temp dir — persists for the scan engine to read at scan time
  const tempDir = path.join(os.tmpdir(), 'rapidscan', id)
  fs.rmSync(tempDir, { recursive: true, force: true })
  fs.mkdirSync(tempDir, { recursive: true })

  const manifest: Array<{ path: string; extension: string; sizeBytes: number }> = []

  for (const entry of candidates) {
    const filePath = entry.path!
    try {
      const { data: contentData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: defaultBranch,
      })
      if (Array.isArray(contentData) || contentData.type !== 'file' || !('content' in contentData)) continue
      const decoded = Buffer.from(contentData.content, 'base64')
      const outPath = path.join(tempDir, filePath)
      await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
      await fs.promises.writeFile(outPath, decoded)
      manifest.push({
        path: filePath,
        extension: path.extname(filePath).toLowerCase() || '',
        sizeBytes: decoded.length,
      })
    } catch {
      ctx.log(`Skipping ${filePath}: failed to fetch content`)
    }
  }

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

    await tx.commit()
  } catch (dbErr) {
    await tx.rollback()
    throw dbErr
  }

  return { status: 200, jsonBody: { files: manifest, count: manifest.length } }
}

app.http('ingestGithub', {
  methods: ['POST'],
  route: 'projects/{id}/ingest/github',
  authLevel: 'anonymous',
  handler: ingestGithub,
})
