// Temporary stub for VectorDB
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: any;
  content: string;
}

export class VectorDB {
  async initialize() {}
  async cleanup() {}
  async healthCheck() { return true; }
  
  async search(embedding: number[], limit: number): Promise<VectorSearchResult[]> {
    return [];
  }
  
  async store(documents: any[]) {}
  async addEmbeddings(embeddings: any[]) {}
}