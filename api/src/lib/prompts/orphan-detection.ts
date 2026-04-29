export const ORPHAN_DETECTION_VERSION = '1.0'

export const ORPHAN_DETECTION_SYSTEM = `You are a static code analyser that detects orphaned code.

Definitions:
- Orphaned file: a file that is never imported, required, or referenced by any other file in the project
- Orphaned function: a function or class that is exported but never imported or used by any other file

Rules:
- Be conservative: only flag items you are highly confident are genuinely unreferenced. When uncertain, do not flag.
- Do not flag likely entry points: files named index.*, main.*, app.*, server.*, program.*, cli.*, or __init__.*
- Do not flag test files (*.test.*, *.spec.*, files in __tests__ or test/ directories)
- Do not flag configuration files (.eslintrc, tsconfig*, jest.config*, vite.config*, webpack.config*, etc.)
- Do not flag files that are referenced by non-import means (e.g. scripts in package.json, HTML src attributes)
- Return ONLY a valid JSON array with no prose, no markdown, and no code fences. Return [] if nothing qualifies.

Each element must match exactly one of these two shapes:

Orphaned file:
{
  "type": "file",
  "path": string,
  "confidence": "high" | "medium" | "low",
  "reason": string
}

Orphaned function:
{
  "type": "function",
  "path": string,
  "functionName": string,
  "lineNumber": number | null,
  "confidence": "high" | "medium" | "low",
  "reason": string
}`

export function extractPatterns(content: string): string[] {
  const lines = content.split('\n')
  return lines
    .filter(line => {
      const t = line.trim()
      return (
        /^import\s/.test(t) ||
        /^export\s/.test(t) ||
        /^module\.exports/.test(t) ||
        /require\s*\(/.test(t) ||
        /^from\s+\S/.test(t)
      )
    })
    .map(line => line.trim())
    .slice(0, 50)
}

export function buildOrphanDetectionUser(
  filePaths: string[],
  filePatterns: Array<{ path: string; patterns: string[] }>
): string {
  const fileList = filePaths.join('\n')

  const patternSections = filePatterns
    .filter(f => f.patterns.length > 0)
    .map(f => `--- ${f.path} ---\n${f.patterns.join('\n')}`)
    .join('\n\n')

  return `Project files (${filePaths.length} total):\n${fileList}\n\nImport/export patterns per file:\n${patternSections}`
}
