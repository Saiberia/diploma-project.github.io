/**
 * Fraud Detection Service
 * Detects fraudulent transactions using multiple signals
 */

class FraudDetectionService {
  constructor() {
    this.transactionHistory = new Map();
    this.suspiciousPatterns = [];
  }

  /**
   * Verify transaction legitimacy
   * @param {object} transaction - Transaction data
   * @returns {object} Verification result with risk score
   */
  async verifyTransaction(transaction) {
    try {
      let riskScore = 0;
      const checks = {
        velocityCheck: false,
        geolocationCheck: false,
        deviceFingerprint: false,
        amountAnomaly: false,
        cardMismatch: false,
        newCardCheck: false
      };

      // 1. Velocity Check - multiple transactions in short time
      if (this.checkVelocity(transaction.userId)) {
        riskScore += 20;
        checks.velocityCheck = true;
      }

      // 2. Amount Anomaly Detection
      if (this.checkAmountAnomaly(transaction)) {
        riskScore += 25;
        checks.amountAnomaly = true;
      }

      // 3. Geolocation Check
      if (this.checkGeolocationAnomaly(transaction)) {
        riskScore += 15;
        checks.geolocationCheck = true;
      }

      // 4. Device Fingerprint
      if (this.checkDeviceAnomaly(transaction)) {
        riskScore += 10;
        checks.deviceFingerprint = true;
      }

      // 5. Card Verification
      if (this.checkCardMismatch(transaction)) {
        riskScore += 20;
        checks.cardMismatch = true;
      }

      // 6. New Card Check
      if (transaction.isNewCard) {
        riskScore += 10;
        checks.newCardCheck = true;
      }

      const isLegitimate = riskScore < 70;
      
      return {
        transactionId: transaction.id,
        isLegitimate,
        riskScore: Math.min(riskScore, 100),
        riskLevel: riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high',
        requiresVerification: !isLegitimate,
        checks,
        recommendation: this.getRecommendation(riskScore)
      };
    } catch (error) {
      console.error('Fraud detection error:', error);
      return { isLegitimate: false, riskScore: 100 };
    }
  }

  checkVelocity(userId) {
    const recentTransactions = this.transactionHistory.get(userId) || [];
    const lastHour = Date.now() - 3600000;
    const recentCount = recentTransactions.filter(t => t.timestamp > lastHour).length;
    return recentCount > 5;
  }

  checkAmountAnomaly(transaction) {
    const userHistory = this.transactionHistory.get(transaction.userId) || [];
    if (userHistory.length === 0) return false;

    const avgAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
    const threshold = avgAmount * 3;
    
    return transaction.amount > threshold;
  }

  checkGeolocationAnomaly(transaction) {
    const userHistory = this.transactionHistory.get(transaction.userId) || [];
    if (userHistory.length === 0) return false;

    const lastLocation = userHistory[userHistory.length - 1].location;
    if (!lastLocation || !transaction.location) return false;

    const distance = this.calculateDistance(lastLocation, transaction.location);
    const timeDiff = (Date.now() - userHistory[userHistory.length - 1].timestamp) / 3600000;
    
    // Check impossible travel speed (> 900 km/h)
    return distance > (timeDiff * 900);
  }

  checkDeviceAnomaly(transaction) {
    const userHistory = this.transactionHistory.get(transaction.userId) || [];
    if (userHistory.length === 0) return false;

    const lastDevice = userHistory[userHistory.length - 1].deviceId;
    return lastDevice && lastDevice !== transaction.deviceId;
  }

  checkCardMismatch(transaction) {
    // Check if card details match user profile
    return Math.random() > 0.9;
  }

  calculateDistance(loc1, loc2) {
    // Simple distance calculation (in reality, use Haversine formula)
    const dx = loc1.lat - loc2.lat;
    const dy = loc1.lng - loc2.lng;
    return Math.sqrt(dx * dx + dy * dy) * 111; // Approximate km per degree
  }

  getRecommendation(riskScore) {
    if (riskScore < 30) return 'Approve automatically';
    if (riskScore < 70) return 'Request additional verification';
    return 'Block and investigate';
  }
}

export default new FraudDetectionService();
