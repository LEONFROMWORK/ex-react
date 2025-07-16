import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface FileData {
  id: string
  name: string
  size: number
  uploadedAt: Date
  status: 'uploading' | 'analyzing' | 'completed' | 'error'
}

export interface AnalysisResult {
  id: string
  type: 'error' | 'warning' | 'optimization' | 'vba'
  severity: 'high' | 'medium' | 'low'
  location: string
  description: string
  suggestion?: string
  canAutoFix: boolean
  selected?: boolean
}

export interface FileVersion {
  id: string
  fileId: string
  versionNumber: number
  createdAt: Date
  changes: string[]
  size: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  fileContext?: string
}

interface FileContextState {
  // State
  currentFile: FileData | null
  analysisResults: AnalysisResult[]
  selectedFixes: Set<string>
  chatHistory: ChatMessage[]
  versions: FileVersion[]
  isAnalyzing: boolean
  error: string | null
  
  // Actions
  setCurrentFile: (file: FileData | null) => void
  setAnalysisResults: (results: AnalysisResult[]) => void
  toggleFix: (fixId: string) => void
  selectAllFixes: () => void
  deselectAllFixes: () => void
  addChatMessage: (message: ChatMessage) => void
  addVersion: (version: FileVersion) => void
  setAnalyzing: (isAnalyzing: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  loadChatHistory: (fileId: string) => void
  saveChatHistory: (fileId: string) => void
  clearChatHistory: (fileId: string) => void
}

export const useFileStore = create<FileContextState>()(
  devtools(
    (set) => ({
      // Initial state
      currentFile: null,
      analysisResults: [],
      selectedFixes: new Set(),
      chatHistory: [],
      versions: [],
      isAnalyzing: false,
      error: null,
      
      // Actions
      setCurrentFile: (file) => set({ currentFile: file, error: null }),
      
      setAnalysisResults: (results) => set({ 
        analysisResults: results,
        selectedFixes: new Set(results.filter(r => r.canAutoFix).map(r => r.id))
      }),
      
      toggleFix: (fixId) => set((state) => {
        const newSet = new Set(state.selectedFixes)
        if (newSet.has(fixId)) {
          newSet.delete(fixId)
        } else {
          newSet.add(fixId)
        }
        return { selectedFixes: newSet }
      }),
      
      selectAllFixes: () => set((state) => ({
        selectedFixes: new Set(state.analysisResults.filter(r => r.canAutoFix).map(r => r.id))
      })),
      
      deselectAllFixes: () => set({ selectedFixes: new Set() }),
      
      addChatMessage: (message) => set((state) => ({
        chatHistory: [...state.chatHistory, message]
      })),
      
      addVersion: (version) => set((state) => ({
        versions: [...state.versions, version].sort((a, b) => b.versionNumber - a.versionNumber)
      })),
      
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      
      setError: (error) => set({ error, isAnalyzing: false }),
      
      reset: () => set({
        currentFile: null,
        analysisResults: [],
        selectedFixes: new Set(),
        chatHistory: [],
        versions: [],
        isAnalyzing: false,
        error: null
      }),
      
      loadChatHistory: (fileId) => {
        try {
          const stored = localStorage.getItem(`chat-history-${fileId}`)
          if (stored) {
            const messages = JSON.parse(stored)
            // Convert timestamp strings back to Date objects
            const parsedMessages = messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            set({ chatHistory: parsedMessages })
          } else {
            set({ chatHistory: [] })
          }
        } catch (error) {
          console.error('Failed to load chat history:', error)
          set({ chatHistory: [] })
        }
      },
      
      saveChatHistory: (fileId) => set((state) => {
        try {
          localStorage.setItem(`chat-history-${fileId}`, JSON.stringify(state.chatHistory))
        } catch (error) {
          console.error('Failed to save chat history:', error)
        }
        return {}
      }),
      
      clearChatHistory: (fileId) => {
        try {
          localStorage.removeItem(`chat-history-${fileId}`)
          set({ chatHistory: [] })
        } catch (error) {
          console.error('Failed to clear chat history:', error)
        }
      }
    }),
    {
      name: 'file-storage',
    }
  )
)