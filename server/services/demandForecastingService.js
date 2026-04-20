/**
 * Demand Forecasting Service
 * Predicts demand for products using time series analysis
 */

class DemandForecastingService {
  constructor() {
    this.salesHistory = new Map();
  }

  /**
   * Forecast demand for a product
   * @param {string} productId - Product ID
   * @param {array} historicalData - Historical sales data
   * @returns {object} Demand forecast
   */
  async forecastDemand(productId, historicalData = []) {
    try {
      // Generate mock forecast
      const baselineDemand = 100;
      const trend = 1.05; // 5% growth trend
      const seasonality = this.getSeasonalityFactor();

      const predictions = [
        { period: 'Today', expectedDemand: Math.round(baselineDemand * seasonality), confidence: 0.95 },
        { period: 'Tomorrow', expectedDemand: Math.round(baselineDemand * seasonality * trend), confidence: 0.88 },
        { period: 'This Week', expectedDemand: Math.round(baselineDemand * 7 * seasonality * trend), confidence: 0.82 },
        { period: 'Next Week', expectedDemand: Math.round(baselineDemand * 7 * seasonality * Math.pow(trend, 2)), confidence: 0.75 },
        { period: 'This Month', expectedDemand: Math.round(baselineDemand * 30 * seasonality * Math.pow(trend, 2)), confidence: 0.68 }
      ];

      const recommendedStock = this.calculateOptimalStock(predictions);
      const priceRecommendation = this.getPriceOptimization(predictions);

      return {
        productId,
        predictions,
        recommendedStockLevel: recommendedStock,
        priceOptimization: priceRecommendation,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Demand forecasting error:', error);
      return { productId, predictions: [], error: true };
    }
  }

  getSeasonalityFactor() {
    const date = new Date();
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    // Higher demand on weekends
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      return 1.3;
    }

    // Higher demand on paydays
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      return 1.25;
    }

    return 1.0;
  }

  calculateOptimalStock(predictions) {
    const maxDemand = Math.max(...predictions.map(p => p.expectedDemand));
    return Math.ceil(maxDemand * 1.2); // 20% buffer stock
  }

  getPriceOptimization(predictions) {
    const avgDemand = predictions.reduce((sum, p) => sum + p.expectedDemand, 0) / predictions.length;
    
    if (avgDemand > 500) {
      return 'Consider increasing price due to high demand (elasticity-based pricing)';
    } else if (avgDemand < 100) {
      return 'Consider reducing price to boost sales';
    }
    return 'Current pricing is optimal for expected demand';
  }
}

export default new DemandForecastingService();
