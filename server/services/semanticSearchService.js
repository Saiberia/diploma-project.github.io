/**
 * Semantic Search Service
 * Implements vector-based semantic search for products
 */

class SemanticSearchService {
  constructor() {
    this.products = [];
    this.embeddings = new Map();
  }

  /**
   * Semantic search using text embeddings
   * @param {string} query - Search query
   * @param {array} products - Products to search
   * @returns {array} Ranked search results
   */
  async search(query, products) {
    try {
      const queryEmbedding = this.generateEmbedding(query);
      
      const results = products.map(product => {
        const productEmbedding = this.generateEmbedding(
          `${product.name} ${product.description} ${product.category}`
        );
        
        return {
          ...product,
          relevance: this.calculateCosineSimilarity(queryEmbedding, productEmbedding)
        };
      });

      // Sort by relevance and return
      return results
        .filter(r => r.relevance > 0.3)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 20);
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Generate simple embedding vector from text
   * @param {string} text - Text to embed
   * @returns {array} Embedding vector
   */
  generateEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(100).fill(0);

    // Simple hash-based embedding
    words.forEach(word => {
      const hash = this.simpleHash(word);
      for (let i = 0; i < word.length; i++) {
        embedding[(hash + i) % 100] += 1 / word.length;
      }
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
    return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {array} vec1 - Vector 1
   * @param {array} vec2 - Vector 2
   * @returns {number} Similarity score 0-1
   */
  calculateCosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    return dotProduct;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export default new SemanticSearchService();
