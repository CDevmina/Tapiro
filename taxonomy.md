# Taxonomy Guide

The Tapiro Taxonomy is a hierarchical classification system used to categorize products, services, and user interests. Accurate use of this taxonomy is **essential** for the effectiveness of Tapiro's AI models in generating meaningful user preferences.

## Purpose

- **Standardization:** Ensures that data submitted by different stores uses a consistent language for products and interests.
- **AI Training:** Provides structured input for the machine learning models that analyze user behavior and build preference profiles.
- **Preference Granularity:** Allows for preferences to be understood at different levels (e.g., general interest in "Electronics" vs. specific interest in "Smartphones" with a preference for "Apple" brand).

## Structure

The taxonomy consists of:

- **Categories:** Broad groupings (e.g., "Electronics", "Fashion", "Home").
- **Sub-categories:** More specific groupings within a parent category (e.g., "Smartphones" under "Electronics"). Categories have unique IDs (e.g., `"101"`) and names (e.g., `"Smartphones"`).
- **Attributes:** Characteristics relevant to a specific category (e.g., "brand", "color", "size" for "Smartphones"). Attributes have defined possible values.

**Example Snippet (Conceptual):**

```yaml
version: "1.0.0"
categories:
  - id: "100"
    name: "Electronics"
    # ... attributes for Electronics ...
  - id: "101"
    name: "Smartphones"
    parent_id: "100"
    attributes:
      - name: "brand"
        values: [Apple, Samsung, Google, ...]
      - name: "color"
        values: [black, white, blue, ...]
      # ... other smartphone attributes ...
  - id: "200"
    name: "Fashion"
    # ... attributes for Fashion ...
  - id: "201"
    name: "Clothing"
    parent_id: "200"
    attributes:
      - name: "type"
        values: [shirts, pants, dresses, ...]
      - name: "material"
        values: [cotton, polyester, wool, ...]
      # ... other clothing attributes ...
```
