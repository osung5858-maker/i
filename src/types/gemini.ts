// Gemini AI API 응답 타입 정의

export interface GeminiParentingResponse {
  mainInsight?: string
  nextAction?: string
  warning?: string
  feedAnalysis?: string
  sleepAnalysis?: string
  parentTip?: string
  status?: '좋음' | '보통' | '주의'
  statusEmoji?: string
  greeting?: string
}

export interface GeminiPregnantResponse {
  weekSummary?: string
  developmentInsight?: string
  healthTip?: string
  warning?: string
  symptomAdvice?: string
  nutritionTip?: string
}

export interface GeminiPreparingResponse {
  cycleInsight?: string
  ovulationPrediction?: string
  fertilityAdvice?: string
  healthTip?: string
  warning?: string
  nutritionTip?: string
}

export interface GeminiFoodCheckResponse {
  result: 'safe' | 'caution' | 'avoid'
  reason: string
  alternatives?: string[]
  nutritionInfo?: string
}

export interface GeminiGrowthSimResponse {
  predictedHeight: number
  predictedWeight: number
  confidenceLevel: 'high' | 'medium' | 'low'
  insights: string[]
  methodology: string
}

export interface GeminiTemperamentResponse {
  primaryType: string
  secondaryType?: string
  description: string
  strengths: string[]
  challenges: string[]
  parentingTips: string[]
}

export interface GeminiNameResponse {
  names: Array<{
    name: string
    hanja?: string
    meaning: string
    score: number
    reasoning: string
  }>
}

export interface GeminiCardResponse {
  title: string
  body: string
  disclaimer?: string
  action?: {
    label: string
    href: string
  }
}
