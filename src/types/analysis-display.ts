export interface AnalysisResult {
  url: string
  score: number
  status: RiskStatus
  confidence: number
  findings: Finding[]
  technicalData: TechnicalData
  timestamp: Date
}

export interface Finding {
  id: string
  type: 'positive' | 'negative' | 'neutral'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  icon: string
  details?: string
}

export interface TechnicalData {
  domainAge: DomainAgeData
  ssl: SSLData
  reputation: ReputationData
  ai: AIAnalysisData
  raw: Record<string, unknown>
}

export interface DomainAgeData {
  ageInDays: number
  registrationDate: Date
  expirationDate?: Date
  registrar?: string
}

export interface SSLData {
  isValid: boolean
  issuer: string
  validFrom: Date
  validTo: Date
  algorithm: string
  keySize: number
}

export interface ReputationData {
  sources: ReputationSource[]
  overallRating: 'safe' | 'suspicious' | 'malicious' | 'unknown'
  lastChecked: Date
}

export interface ReputationSource {
  name: string
  score: number
  category: string
  lastUpdated: Date
}

export interface AIAnalysisData {
  contentScore: number
  patterns: DetectedPattern[]
  confidence: number
  flags: string[]
  summary: string
}

export interface DetectedPattern {
  type: string
  confidence: number
  description: string
  severity: 'low' | 'medium' | 'high'
}

export type RiskStatus = 'safe' | 'moderate' | 'caution' | 'danger'
export type ShareMethod = 'link' | 'twitter' | 'facebook' | 'email'
export type ExportFormat = 'pdf' | 'json' | 'csv'