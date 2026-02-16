import type { IBaseIntegration } from '../core/types';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  image?: string;
  score: number;
}

export interface SearchFilters {
  categories?: string[];
  tags?: string[];
  facets?: Record<string, string[]>;
}

export interface ISearchIntegration extends IBaseIntegration {
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  autocomplete(query: string): Promise<string[]>;
  indexContent(documents: any[]): Promise<void>;
}
