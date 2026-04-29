export const TASK_GENERATION_VERSION = '1.0'

export const TASK_GENERATION_SYSTEM = `You are a software engineering expert that creates actionable remediation tasks for dependency issues.

You will receive a single dependency record with its references and call chains, plus a summary of other project dependencies for context.

Return ONLY a valid JSON object with no prose, no markdown, and no code fences. The object must have exactly these fields:

{
  "title": string,           // concise, actionable title — max 100 characters
  "description": string,     // clear explanation of the issue and its impact (plain text)
  "severity": "critical" | "high" | "medium" | "low",
  "type": "security" | "deprecation" | "version-update" | "orphaned-code" | "other",
  "complexity": "negligible" | "low" | "medium" | "high",
  "recommended_fix": string, // detailed fix instructions in markdown
  "suggested_tests": string  // verification steps in markdown
}

Severity guidance:
- critical: known CVE, actively exploited, or system integrity at risk
- high: significant security risk, breaking deprecation, or major version gap with breaking changes
- medium: deprecated API, moderate version lag, or unused code causing maintenance burden
- low: minor version lag, optional improvement, or cosmetic orphaned code

Type guidance:
- security: dependency has known vulnerabilities
- deprecation: dependency or API is deprecated / end-of-life
- version-update: newer version available without known security issues
- orphaned-code: unused code that should be removed (use when category is "orphaned")
- other: does not fit the above categories

Complexity guidance (effort to fix):
- negligible: automated update or one-liner removal
- low: under 2 hours, localised change
- medium: 2–8 hours, touches multiple files or requires testing
- high: over 8 hours, architectural impact or high regression risk`

interface Reference {
  file_path: string
  line_number: number | null
  parent_function: string | null
  parent_class: string | null
  call_chain: Array<{
    caller_function: string | null
    caller_file: string | null
    caller_line: number | null
    chain_depth: number
    confidence: string
  }>
}

interface ContextDep {
  category: string
  name: string
  status: string
}

export function buildTaskGenerationUser(
  dep: {
    category: string
    name: string
    current_version: string | null
    latest_version: string | null
    status: string
  },
  references: Reference[],
  context: ContextDep[]
): string {
  const depLines = [
    `Category: ${dep.category}`,
    `Name: ${dep.name}`,
    dep.current_version ? `Current version: ${dep.current_version}` : null,
    dep.latest_version ? `Latest version: ${dep.latest_version}` : null,
    `Status: ${dep.status}`,
  ].filter((l): l is string => l !== null)

  const refLines = references.map(r => {
    const parts = [
      r.file_path,
      r.line_number != null ? `line ${r.line_number}` : null,
      r.parent_function ? `in ${r.parent_function}` : null,
      r.parent_class ? `(class ${r.parent_class})` : null,
    ].filter(Boolean)
    const loc = parts.join(', ')
    const chains = r.call_chain
      .map(c =>
        `  depth ${c.chain_depth} [${c.confidence}]: ${c.caller_function ?? 'anonymous'} at ${c.caller_file ?? '?'}${c.caller_line != null ? `:${c.caller_line}` : ''}`
      )
      .join('\n')
    return chains ? `${loc}\n${chains}` : loc
  })

  const contextLines = context.map(c => `${c.category}: ${c.name} (${c.status})`)

  return [
    '=== DEPENDENCY ===',
    depLines.join('\n'),
    '',
    '=== REFERENCES ===',
    refLines.length > 0 ? refLines.join('\n\n') : '(no references recorded)',
    '',
    '=== PROJECT CONTEXT (other dependencies) ===',
    contextLines.length > 0 ? contextLines.join('\n') : '(none)',
  ].join('\n')
}
