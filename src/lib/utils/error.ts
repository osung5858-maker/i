/**
 * 에러 핸들링 유틸리티
 *
 * 향후 Sentry 등 에러 트래킹 서비스 통합 시 이 파일만 수정하면 됨
 */

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  componentStack?: string
  metadata?: Record<string, unknown>
}

/**
 * 에러 로깅 (개발 환경에서는 console, 프로덕션에서는 추후 Sentry 등 연동)
 */
export function logError(error: Error | unknown, context?: ErrorContext) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', {
      message: errorMessage,
      stack: errorStack,
      ...context,
    })
  } else {
    // TODO: 프로덕션에서는 Sentry.captureException(error, { extra: context })
    // 현재는 최소한의 로깅만
    console.error('[Error]', errorMessage, context?.component, context?.action)
  }
}

/**
 * 사용자에게 표시할 에러 메시지 생성
 */
export function getUserFriendlyMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    // Supabase 에러
    if (error.message.includes('JWT')) {
      return '로그인이 만료되었습니다. 다시 로그인해주세요.'
    }
    if (error.message.includes('network')) {
      return '네트워크 연결을 확인해주세요.'
    }
    if (error.message.includes('permission')) {
      return '권한이 없습니다.'
    }
  }

  return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

/**
 * 비동기 함수 에러 래퍼
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<[T | null, Error | null]> {
  try {
    const result = await fn()
    return [result, null]
  } catch (error) {
    logError(error, context)
    return [null, error instanceof Error ? error : new Error(String(error))]
  }
}

/**
 * 에러 경계 래퍼 (React 컴포넌트용)
 */
export function captureError(error: Error, errorInfo: React.ErrorInfo, context?: ErrorContext) {
  logError(error, {
    ...context,
    componentStack: errorInfo.componentStack || undefined,
  })
}
