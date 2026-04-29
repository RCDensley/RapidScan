export type DependencyCategory = 'npm' | 'azure-sdk' | 'ai-model' | 'third-party-api' | 'azure-service' | 'orphaned' | 'other'
export type Confidence = 'high' | 'medium' | 'low'

export interface CallChainEntry {
  callerFunction: string | null
  callerFile: string | null
  callerLine: number | null
  chainDepth: number
  confidence: Confidence
}

export interface DependencyFinding {
  category: DependencyCategory
  name: string
  version: string | null
  lineNumber: number | null
  parentFunction: string | null
  parentClass: string | null
  callChain: CallChainEntry[]
}

export type HeavyScanResult = DependencyFinding[]

export interface OrphanFinding {
  type: 'file' | 'function'
  path: string
  functionName?: string
  lineNumber?: number | null
  confidence: Confidence
  reason: string
}
