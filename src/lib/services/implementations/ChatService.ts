import { IChatService, ChatResponse, ChatMessage, FileContext } from '../interfaces'

export class ChatService implements IChatService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'

  async sendMessage(message: string, context?: FileContext): Promise<ChatResponse> {
    try {
      // Mock implementation
      // In production, this would call the actual chat API
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate AI response based on message
      let response: ChatResponse = {
        message: '',
        suggestions: [],
        codeSnippets: []
      }
      
      if (message.toLowerCase().includes('vlookup')) {
        response = {
          message: 'VLOOKUP은 성능상 INDEX/MATCH가 더 효율적입니다. 다음과 같이 변경해보세요:',
          suggestions: [
            'INDEX/MATCH 사용하기',
            'XLOOKUP 사용하기 (Excel 365)',
            '피벗 테이블 고려하기'
          ],
          codeSnippets: [{
            language: 'excel',
            code: '=INDEX(B:B, MATCH(A1, A:A, 0))',
            description: 'VLOOKUP 대신 INDEX/MATCH 사용'
          }]
        }
      } else if (message.toLowerCase().includes('error')) {
        response = {
          message: '오류 처리를 위해 IFERROR 함수를 사용하는 것을 권장합니다.',
          codeSnippets: [{
            language: 'excel',
            code: '=IFERROR(your_formula, "Error occurred")',
            description: '오류 처리 래퍼'
          }]
        }
      } else {
        response = {
          message: '질문을 이해했습니다. 파일의 어떤 부분에 대해 더 자세히 알고 싶으신가요?',
          suggestions: [
            '수식 최적화',
            '데이터 검증',
            'VBA 코드 개선'
          ]
        }
      }
      
      return response
    } catch (error) {
      console.error('Chat error:', error)
      throw new Error('Failed to send message')
    }
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      // Mock implementation
      return [
        {
          id: '1',
          role: 'user',
          content: 'VLOOKUP이 너무 느린데 어떻게 개선할 수 있나요?',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          id: '2',
          role: 'assistant',
          content: 'VLOOKUP은 대용량 데이터에서 성능이 떨어집니다. INDEX/MATCH를 사용하면 더 빠른 성능을 얻을 수 있습니다.',
          timestamp: new Date(Date.now() - 4 * 60 * 1000)
        }
      ]
    } catch (error) {
      console.error('Error fetching history:', error)
      throw new Error('Failed to fetch chat history')
    }
  }
}