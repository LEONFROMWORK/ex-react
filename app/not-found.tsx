export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mb-6 text-2xl font-semibold text-gray-700">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mb-8 text-gray-600">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="space-x-4">
          <a
            href="/"
            className="inline-block rounded-md bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            홈으로 돌아가기
          </a>
          <a
            href="/dashboard"
            className="inline-block rounded-md border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50"
          >
            대시보드로 이동
          </a>
        </div>
      </div>
    </div>
  )
}