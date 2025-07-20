'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-lg text-center">
        <h1 className="mb-4 text-6xl font-bold text-red-600">500</h1>
        <h2 className="mb-6 text-2xl font-semibold text-gray-700">
          서버 오류가 발생했습니다
        </h2>
        <p className="mb-4 text-gray-600">
          요청을 처리하는 중에 예기치 않은 오류가 발생했습니다.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              오류 상세 정보 보기
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-4 text-xs">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        <div className="space-x-4">
          <button
            onClick={reset}
            className="inline-block rounded-md bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-block rounded-md border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}