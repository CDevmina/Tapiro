from collections import Counter, defaultdict
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

def predict_preferences(features: Dict[str, Any], existing_preferences: Dict[str, float] = None):
    """
    Predict user preferences based on extracted features
    
    Args:
        features: Dictionary of extracted features
        existing_preferences: Current user preferences, if available
        
    Returns:
        dict: Updated preference predictions
    """
    # Start with existing preferences if available
    predictions = {}
    if existing_preferences:
        # Apply time decay to existing preferences
        predictions = {k: v * 0.8 for k, v in existing_preferences.items()}
    
    # Process feature-based predictions
    if 'category_counts' in features:
        # Normalize category counts into preference scores
        total_count = sum(features['category_counts'].values()) or 1
        for category, count in features['category_counts'].items():
            normalized_score = min(count / total_count, 0.5)  # Cap at 0.5
            current = predictions.get(category, 0)
            predictions[category] = min(current + normalized_score, 1.0)  # Cap at 1.0
    
    # Apply recency weighting if available
    if 'recency_weights' in features and features['recency_weights']:
        avg_recency = sum(features['recency_weights'].values()) / len(features['recency_weights'])
        # Boost scores based on recency
        for category in predictions:
            predictions[category] = min(predictions[category] * (1 + avg_recency * 0.2), 1.0)
    
    # Sort by score descending
    predictions = {k: v for k, v in sorted(
        predictions.items(), key=lambda item: item[1], reverse=True)}
    
    return predictions

def predict_attribute_preferences(
    attribute_distributions: Dict[str, Dict[str, Counter]],
    current_attributes: Dict[str, Dict[str, Dict[str, float]]] = None,
    decay_factor: float = 0.8
) -> Dict[str, Dict[str, Dict[str, float]]]:
    """
    Predict attribute preferences based on observed distributions
    
    Args:
        attribute_distributions: Observed attribute value distributions
        current_attributes: Current attribute preferences, if available
        decay_factor: Weight to apply to existing preferences
        
    Returns:
        dict: Updated attribute preferences
    """
    # Initialize with decayed existing attributes if available
    result = {}
    if current_attributes:
        for category, attrs in current_attributes.items():
            result[category] = {}
            for attr_name, values in attrs.items():
                result[category][attr_name] = {
                    k: v * decay_factor for k, v in values.items()
                }
    
    # Update with new attribute distributions
    for category, attr_dict in attribute_distributions.items():
        if category not in result:
            result[category] = {}
            
        for attr_name, value_counts in attr_dict.items():
            if attr_name not in result[category]:
                result[category][attr_name] = {}
                
            # Calculate new distribution
            total = sum(value_counts.values()) or 1
            
            for value, count in value_counts.items():
                # Normalize and add to current preference
                importance = count / total * (1 - decay_factor)
                current = result[category][attr_name].get(value, 0)
                result[category][attr_name][value] = min(current + importance, 1.0)
    
    # Sort each attribute values by preference score
    for category in result:
        for attr_name in result[category]:
            result[category][attr_name] = {k: v for k, v in sorted(
                result[category][attr_name].items(), key=lambda item: item[1], reverse=True)}
    
    return result