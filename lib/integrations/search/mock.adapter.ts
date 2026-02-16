import { BaseIntegration } from '../core/base-integration';
import type { ISearchIntegration, SearchResult, SearchFilters } from './search.interface';

export class MockSearchAdapter extends BaseIntegration implements ISearchIntegration {
  private index: SearchResult[] = [];

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    await this.simulateLatency();

    const lowercaseQuery = query.toLowerCase();

    let results = this.index.filter(
      (item) =>
        item.title.toLowerCase().includes(lowercaseQuery) ||
        item.description?.toLowerCase().includes(lowercaseQuery)
    );

    // Apply filters if provided
    if (filters?.categories && filters.categories.length > 0) {
      // Mock category filtering
      results = results.filter((item) =>
        filters.categories?.some((cat) => item.url.includes(cat))
      );
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 20);
  }

  async autocomplete(query: string): Promise<string[]> {
    await this.simulateLatency();

    const lowercaseQuery = query.toLowerCase();

    const suggestions = this.index
      .filter((item) => item.title.toLowerCase().startsWith(lowercaseQuery))
      .map((item) => item.title)
      .slice(0, 10);

    return suggestions;
  }

  async indexContent(documents: any[]): Promise<void> {
    await this.simulateLatency();

    this.index = documents.map((doc, idx) => ({
      id: doc.id || `doc-${idx}`,
      title: doc.title || '',
      description: doc.description || '',
      url: doc.url || '',
      image: doc.image,
      score: 1.0,
    }));

    this.log('info', `Indexed ${this.index.length} documents`);
  }
}
