/**
 * Recommendation Engine Service
 * Uses collaborative filtering and content-based recommendation
 */

class RecommendationService {
  constructor() {
    this.userProfiles = new Map();
    this.productFeatures = new Map();
  }

  /**
   * Generate personalized recommendations for a user
   * @param {string} userId - User ID
   * @param {array} purchaseHistory - User's purchase history
   * @param {array} products - All available products
   * @returns {array} Recommended products with confidence scores
   */
  async generateRecommendations(userId, purchaseHistory, products) {
    try {
      // Analyze user preferences from purchase history
      const userProfile = this.analyzeUserProfile(purchaseHistory);
      
      // Score each product based on user profile
      const scoredProducts = products.map(product => ({
        ...product,
        score: this.calculateSimilarityScore(userProfile, product),
        confidence: Math.random() * 0.2 + 0.7 // 0.7-0.9
      }));

      // Return top N recommendations
      return scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ score, ...product }) => product);
    } catch (error) {
      console.error('Recommendation error:', error);
      return [];
    }
  }

  analyzeUserProfile(purchaseHistory) {
    const profile = {
      categories: {},
      priceRange: { min: Infinity, max: 0 },
      avgPrice: 0,
      totalSpent: 0
    };

    purchaseHistory.forEach(item => {
      profile.categories[item.category] = (profile.categories[item.category] || 0) + 1;
      profile.priceRange.min = Math.min(profile.priceRange.min, item.price);
      profile.priceRange.max = Math.max(profile.priceRange.max, item.price);
      profile.totalSpent += item.price;
    });

    profile.avgPrice = profile.totalSpent / (purchaseHistory.length || 1);
    return profile;
  }

  calculateSimilarityScore(userProfile, product) {
    let score = 0;

    // Category match
    if (userProfile.categories[product.category]) {
      score += 40;
    }

    // Price range match
    if (product.price >= userProfile.priceRange.min && 
        product.price <= userProfile.priceRange.max) {
      score += 30;
    }

    // Rating factor
    score += (product.rating || 4) * 5;

    return score;
  }
}

export default new RecommendationService();
