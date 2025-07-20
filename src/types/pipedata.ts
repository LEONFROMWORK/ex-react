// PipeData 통합을 위한 타입 정의

export interface PipeDataQA {
  question: string;
  answer: string;
  excel_functions: string[];
  code_snippets: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  quality_score: number; // 0-10 점수
  source: string; // 'pipedata_stackoverflow', 'pipedata_reddit', etc.
  metadata: PipeDataMetadata;
}

export interface PipeDataMetadata {
  votes?: number;
  accepted?: boolean;
  tags: string[];
  author?: string;
  created_at?: string;
  url?: string;
  language?: string;
}

export interface PipeDataBatch {
  data: PipeDataQA[];
  batch_id: string;
  timestamp: string;
  source_info: {
    collection_date: string;
    total_items: number;
    quality_threshold: number;
  };
}

export interface ProcessedKnowledgeItem {
  id: string;
  question: string;
  answer: string;
  excel_functions: string[];
  code_snippets: string[];
  difficulty: string;
  quality_score: number;
  source: string;
  tags: string[];
  embedding?: number[]; // 벡터 임베딩
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface KnowledgeSearchResult {
  item: ProcessedKnowledgeItem;
  similarity_score: number;
  relevance_score: number;
}

export interface PipeDataSyncStatus {
  last_sync: Date;
  total_items: number;
  success_count: number;
  error_count: number;
  batch_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors?: string[];
}

// RAG 시스템용 컨텍스트
export interface EnhancedAnalysisContext {
  user_query: string;
  excel_errors?: string[];
  file_context?: {
    sheets: number;
    formulas: string[];
    data_types: string[];
  };
  similar_knowledge: KnowledgeSearchResult[];
  confidence_threshold: number;
}

// AI 응답 강화를 위한 구조
export interface PipeDataEnhancedResponse {
  original_response: string;
  enhanced_response: string;
  knowledge_sources: {
    source: string;
    relevance: number;
    snippet: string;
  }[];
  confidence_boost: number;
  suggested_functions: string[];
  related_examples: string[];
}