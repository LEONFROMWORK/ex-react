export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">총 분석 횟수</h2>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-500 mt-1">데모 모드</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">오류 발견율</h2>
          <p className="text-3xl font-bold text-green-600">0%</p>
          <p className="text-sm text-gray-500 mt-1">데모 모드</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">수정 성공률</h2>
          <p className="text-3xl font-bold text-purple-600">0%</p>
          <p className="text-sm text-gray-500 mt-1">데모 모드</p>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          현재 데모 모드로 실행 중입니다. 실제 데이터는 데이터베이스 연결 후 표시됩니다.
        </p>
      </div>
    </div>
  );
}