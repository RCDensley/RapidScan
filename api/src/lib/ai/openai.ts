interface FoundryOutputItem {
  type: string
  content?: Array<{ type: string; text?: string }>
}

interface FoundryResponse {
  output?: FoundryOutputItem[]
}

function extractText(data: FoundryResponse): string {
  const message = data.output?.find(item => item.type === 'message')
  return message?.content?.find(c => c.type === 'output_text')?.text ?? ''
}

function getFoundryConfig() {
  const endpoint = process.env.RAPIDSCAN_OPENAI_ENDPOINT
  const apiKey = process.env.RAPIDSCAN_OPENAI_API_KEY
  const apiVersion = process.env.RAPIDSCAN_OPENAI_API_VERSION ?? '2025-04-01-preview'
  if (!endpoint) throw new Error('RAPIDSCAN_OPENAI_ENDPOINT is not set')
  if (!apiKey) throw new Error('RAPIDSCAN_OPENAI_API_KEY is not set')
  return { endpoint, apiKey, apiVersion }
}

async function callFoundry(deployment: string, systemPrompt: string, userMessage: string): Promise<string> {
  const { endpoint, apiKey, apiVersion } = getFoundryConfig()

  const input = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  const response = await fetch(`${endpoint}/openai/responses?api-version=${apiVersion}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ model: deployment, input, max_output_tokens: 16384, stream: false }),
  })

  if (!response.ok) throw new Error(`Foundry error ${response.status}: ${await response.text()}`)

  const data = await response.json() as FoundryResponse
  return extractText(data)
}

export function heavyComplete(systemPrompt: string, userMessage: string): Promise<string> {
  const deployment = process.env.RAPIDSCAN_OPENAI_DEPLOYMENT_HEAVY
  if (!deployment) throw new Error('RAPIDSCAN_OPENAI_DEPLOYMENT_HEAVY is not set')
  return callFoundry(deployment, systemPrompt, userMessage)
}

export function lightComplete(systemPrompt: string, userMessage: string): Promise<string> {
  const deployment = process.env.RAPIDSCAN_OPENAI_DEPLOYMENT_LIGHT
  if (!deployment) throw new Error('RAPIDSCAN_OPENAI_DEPLOYMENT_LIGHT is not set')
  return callFoundry(deployment, systemPrompt, userMessage)
}
