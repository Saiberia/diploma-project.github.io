/**
 * Dynamic Pricing Service
 * Calculates prices based on demand, inventory, and user tier
 */

class DynamicPricingService {
  constructor() {
    this.basePrice = {};
    this.inventory = {};
    this.userTiers = {};
  }

  /**
   * Calculate dynamic price for a product
   * @param {string} productId - Product ID
   * @param {number} basePrice - Base price
   * @param {object} factors - Pricing factors
   * @returns {object} Price calculation result
   */
  calculateDynamicPrice(productId, basePrice, factors = {}) {
    try {
      const demandFactor = this.calculateDemandFactor(factors.demand || 50);
      const inventoryFactor = this.calculateInventoryFactor(factors.inventory || 100);
      const seasonalFactor = this.calculateSeasonalFactor();
      const userTierFactor = this.getUserTierFactor(factors.userTier || 'standard');
      const competitionFactor = this.calculateCompetitionFactor(factors.competition || 1.0);

      const dynamicPrice = basePrice 
        * demandFactor 
        * inventoryFactor 
        * seasonalFactor 
        * userTierFactor 
        * competitionFactor;

      return {
        productId,
        basePrice,
        dynamicPrice: Math.round(dynamicPrice * 100) / 100,
        factors: {
          demand: Math.round(demandFactor * 100),
          inventory: Math.round(inventoryFactor * 100),
          seasonal: Math.round(seasonalFactor * 100),
          userTier: Math.round(userTierFactor * 100),
          competition: Math.round(competitionFactor * 100)
        },
        discount: Math.max(0, Math.round((1 - dynamicPrice / basePrice) * 100)),
        recommendation: this.getPricingRecommendation(dynamicPrice, basePrice)
      };
    } catch (error) {
      console.error('Dynamic pricing error:', error);
      return { dynamicPrice: basePrice };
    }
  }

  calculateDemandFactor(demand) {
    // Demand 0-100, factor 0.7-1.5
    return 0.7 + (demand / 100) * 0.8;
  }

  calculateInventoryFactor(inventory) {
    // High inventory = lower prices, low inventory = higher prices
    if (inventory > 1000) return 0.9;
    if (inventory > 500) return 0.95;
    if (inventory > 100) return 1.0;
    if (inventory > 20) return 1.1;
    return 1.2; // Low stock premium
  }

  calculateSeasonalFactor() {
    const date = new Date();
    const month = date.getMonth();
    const dayOfWeek = date.getDay();

    // Holiday season (Nov-Dec)
    if (month >= 10) return 1.15;
    
    // Summer (June-Aug)
    if (month >= 5 && month <= 7) return 1.08;
    
    // Weekend bonus
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) return 1.05;

    return 1.0;
  }

  getUserTierFactor(tier) {
    const tiers = {
      'bronze': 1.0,
      'silver': 0.95,
      'gold': 0.90,
      'platinum': 0.85
    };
    return tiers[tier] || 1.0;
  }

  calculateCompetitionFactor(competition) {
    // 1.0 = no competition, 0.5 = high competition
    return competition;
  }

  getPricingRecommendation(dynamicPrice, basePrice) {
    const change = ((dynamicPrice - basePrice) / basePrice) * 100;
    
    if (change > 10) return 'Price increased due to high demand';
    if (change < -10) return 'Price reduced to stay competitive';
    return 'Price is stable';
  }
}

export default new DynamicPricingService();
