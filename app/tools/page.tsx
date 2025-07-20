import { FileSpreadsheet, Calculator, BarChart, FileText } from 'lucide-react';

export default function ToolsPage() {
  const tools = [
    {
      title: 'Excel 오류 검사기',
      description: 'Excel 파일의 수식 오류와 데이터 불일치를 자동으로 검사합니다.',
      icon: FileSpreadsheet,
      color: 'bg-blue-500',
      status: '준비 중'
    },
    {
      title: '수식 계산기',
      description: '복잡한 Excel 수식을 테스트하고 검증할 수 있습니다.',
      icon: Calculator,
      color: 'bg-green-500',
      status: '준비 중'
    },
    {
      title: '차트 생성기',
      description: '데이터를 기반으로 자동으로 차트를 생성합니다.',
      icon: BarChart,
      color: 'bg-purple-500',
      status: '준비 중'
    },
    {
      title: '보고서 생성기',
      description: 'Excel 데이터를 분석하여 자동으로 보고서를 생성합니다.',
      icon: FileText,
      color: 'bg-orange-500',
      status: '준비 중'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">도구 모음</h1>
        <p className="text-gray-600">Excel 작업을 더욱 효율적으로 만들어주는 다양한 도구들</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`${tool.color} p-3 rounded-lg text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
                  <p className="text-gray-600 mb-3">{tool.description}</p>
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    {tool.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          새로운 도구들이 곧 추가될 예정입니다. 현재는 Excel 분석기 기능을 사용해주세요.
        </p>
      </div>
    </div>
  );
}