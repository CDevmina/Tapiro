from datetime import datetime, timedelta
from typing import Dict, List, Any

def apply_time_decay(preferences: Dict[str, float], decay_rate: float = 0.8) -> Dict[str, float]:
    """
    Apply time-based decay to existing preferences
    
    Args:
        preferences: Dict of category to preference score
        decay_rate: Rate to decay existing preferences (0-1)
        
    Returns:
        Dict of decayed preferences
    """
    return {k: v * decay_rate for k, v in preferences.items()}

def calculate_recency_weights(timestamps: List[datetime], 
                              max_age_days: int = 30) -> List[float]:
    """
    Calculate weights based on recency of timestamps
    
    Args:
        timestamps: List of datetime objects
        max_age_days: Maximum age in days for normalization
        
    Returns:
        List of weights corresponding to timestamps
    """
    now = datetime.now()
    max_age = timedelta(days=max_age_days)
    
    weights = []
    for ts in timestamps:
        if not ts:
            weights.append(0.5)  # Default weight for missing timestamp
            continue
            
        # Calculate age
        age = now - ts
        
        # Convert to normalized weight
        if age > max_age:
            weight = 0.1  # Minimum weight for old items
        else:
            # Linear decay from 1.0 to 0.1
            normalized_age = age / max_age
            weight = 1.0 - (normalized_age * 0.9)
            
        weights.append(weight)
    
    return weights

def weight_entries_by_recency(entries: List[Dict], 
                             max_age_days: int = 30) -> Dict[str, float]:
    """
    Weight entries based on recency
    
    Args:
        entries: List of entry objects with timestamps
        max_age_days: Maximum age in days for normalization
        
    Returns:
        Dictionary of recency weights by entry ID
    """
    # Extract timestamps
    timestamps = []
    ids = []
    
    for i, entry in enumerate(entries):
        ts = entry.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            except:
                ts = None
        timestamps.append(ts)
        ids.append(str(i))  # Use index as ID if not provided
    
    # Calculate weights
    weights = calculate_recency_weights(timestamps, max_age_days)
    
    # Map to entry IDs
    return dict(zip(ids, weights))