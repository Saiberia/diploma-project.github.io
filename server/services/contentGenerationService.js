/**
 * Content Generation Service
 * Uses templates and AI to generate product descriptions
 */

class ContentGenerationService {
  constructor() {
    this.templates = {
      game: 'Experience the ultimate gaming adventure with {name}. {description} Join thousands of players who have already discovered the magic of this {category}. With stunning graphics and engaging gameplay, {name} delivers {features} that will keep you playing for hours.',
      item: '{name} is the perfect addition to your gaming arsenal. {description} Enhance your gaming experience with this premium {category}. Crafted with precision and designed for performance, {name} offers {features} that give you the edge you need.',
      steam: 'Add funds to your Steam account with {name}. {description} Purchase games, cosmetics, and more from the world\'s largest gaming platform. {name} gives you {features} to explore countless gaming possibilities.'
    };
  }

  /**
   * Generate product description using templates
   * @param {object} product - Product data
   * @param {string} tone - Description tone (professional, casual, excitement)
   * @returns {string} Generated description
   */
  generateDescription(product, tone = 'professional') {
    try {
      const template = this.templates[product.category] || this.templates.game;
      
      let description = template
        .replace('{name}', product.name)
        .replace('{description}', product.description || '')
        .replace('{category}', product.category)
        .replace('{features}', this.generateFeatures(product));

      // Apply tone
      description = this.applyTone(description, tone);

      return description;
    } catch (error) {
      console.error('Content generation error:', error);
      return product.description;
    }
  }

  generateFeatures(product) {
    const features = [];

    if (product.rating && product.rating >= 4.5) {
      features.push('exceptional quality');
    }
    
    if (product.reviews && product.reviews > 1000) {
      features.push('proven reliability');
    }

    if (product.price === 0) {
      features.push('free access');
    }

    if (product.price && product.price < 15) {
      features.push('great value');
    }

    return features.length > 0 ? features.join(' and ') : 'outstanding features';
  }

  applyTone(text, tone) {
    const tones = {
      casual: {
        'premium': 'awesome',
        'ultimate': 'sick',
        'stunning': 'mind-blowing',
        'engaging': 'addictive'
      },
      professional: {
        'awesome': 'premium',
        'sick': 'exceptional',
        'mind-blowing': 'remarkable',
        'addictive': 'engaging'
      },
      excitement: {
        'experience': 'unleash',
        'discover': 'unlock',
        'deliver': 'dominate with',
        'offers': 'grants you'
      }
    };

    let result = text;
    if (tones[tone]) {
      Object.entries(tones[tone]).forEach(([from, to]) => {
        result = result.replace(new RegExp(from, 'gi'), to);
      });
    }

    return result;
  }

  /**
   * Generate SEO-optimized title
   */
  generateTitle(product) {
    const templates = [
      `${product.name} - Premium ${product.category}`,
      `Buy ${product.name} - Best ${product.category} Online`,
      `${product.name} | Top-Rated ${product.category}`,
      `Official ${product.name} - ${product.category}`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate meta description for SEO
   */
  generateMetaDescription(product) {
    const description = product.description || '';
    const truncated = description.substring(0, 155);
    return `${truncated}... ${product.rating}★ rated. Buy ${product.name} now!`;
  }
}

export default new ContentGenerationService();
