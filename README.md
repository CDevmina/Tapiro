# Tapiro Product Taxonomy

## Overview

This document defines the standardized product category taxonomy used throughout the Tapiro platform. This taxonomy provides a consistent framework for categorizing products, analyzing user preferences, and delivering targeted advertising.

## 1. Main Categories

The taxonomy is organized hierarchically with main categories and subcategories:

| Category ID | Main Category          | Description                               |
| ----------- | ---------------------- | ----------------------------------------- |
| 100         | Electronics            | Electronic devices and gadgets            |
| 200         | Clothing               | Apparel, footwear, and accessories        |
| 300         | Home & Garden          | Furniture, decor, and household items     |
| 400         | Beauty & Personal Care | Cosmetics, skincare, and personal care    |
| 500         | Sports & Outdoors      | Athletic equipment and recreational items |
| 600         | Books & Media          | Books, e-books, audio, and visual media   |
| 700         | Food & Grocery         | Food, beverages, and household essentials |
| 800         | Automotive             | Car parts, accessories, and maintenance   |
| 900         | Health & Wellness      | Health supplements, medical devices       |
| 1000        | Toys & Games           | Games, toys, and entertainment items      |

## 2. Subcategories

Each main category contains multiple subcategories:

### 2.1 Electronics (100)

| Subcategory ID | Name           | Description                                  |
| -------------- | -------------- | -------------------------------------------- |
| 101            | Smartphones    | Mobile phones and accessories                |
| 102            | Computers      | Laptops, desktops, and components            |
| 103            | Audio          | Headphones, speakers, and sound systems      |
| 104            | TVs & Displays | Televisions, monitors, and projectors        |
| 105            | Cameras        | Digital cameras, video cameras, equipment    |
| 106            | Wearables      | Smartwatches, fitness trackers               |
| 107            | Gaming         | Consoles, games, and accessories             |
| 108            | Smart Home     | IoT devices, smart speakers, home automation |
| 109            | Tablets        | Tablets and e-readers                        |
| 110            | Accessories    | Cables, chargers, adapters, cases            |

### 2.2 Clothing (200)

| Subcategory ID | Name                | Description                           |
| -------------- | ------------------- | ------------------------------------- |
| 201            | Men's Clothing      | Shirts, pants, outerwear for men      |
| 202            | Women's Clothing    | Dresses, tops, bottoms for women      |
| 203            | Children's Clothing | Clothes for kids and babies           |
| 204            | Footwear            | Shoes, sandals, boots for all genders |
| 205            | Accessories         | Bags, hats, scarves, jewelry          |
| 206            | Activewear          | Athletic and workout clothing         |
| 207            | Formal Wear         | Suits, dresses, and formal attire     |
| 208            | Underwear           | Undergarments for all genders         |
| 209            | Seasonal            | Winter coats, swimwear, etc.          |
| 210            | Sustainable Fashion | Eco-friendly and ethical clothing     |

### 2.3 Home & Garden (300)

| Subcategory ID | Name             | Description                           |
| -------------- | ---------------- | ------------------------------------- |
| 301            | Furniture        | Tables, chairs, sofas, beds           |
| 302            | Kitchen          | Cookware, appliances, utensils        |
| 303            | Home Decor       | Decorative items, art, mirrors        |
| 304            | Bedding & Bath   | Linens, towels, bathroom accessories  |
| 305            | Storage          | Organizers, shelving, containers      |
| 306            | Garden           | Plants, tools, outdoor furniture      |
| 307            | Lighting         | Lamps, ceiling lights, smart lighting |
| 308            | Appliances       | Major home appliances                 |
| 309            | Home Improvement | Tools, paint, renovation supplies     |
| 310            | Home Office      | Desks, chairs, office supplies        |

_Note: Additional subcategories for categories 400-1000 would be defined similarly_

## 3. Attributes by Category

Each category has specific attributes that can be tracked for user preferences:

### 3.1 Electronics Attributes

| Attribute    | Possible Values                               | Description               |
| ------------ | --------------------------------------------- | ------------------------- |
| price_range  | budget, mid_range, premium, luxury            | Price tier of the product |
| brand        | apple, samsung, sony, google, lg, other       | Manufacturer or brand     |
| color        | black, white, silver, gold, blue, red, other  | Product color             |
| feature      | wireless, smart, portable, gaming, waterproof | Key features              |
| rating       | 1-5                                           | Customer rating           |
| release_year | numeric                                       | Year of product release   |

### 3.2 Clothing Attributes

| Attribute   | Possible Values                                     | Description               |
| ----------- | --------------------------------------------------- | ------------------------- |
| price_range | budget, mid_range, premium, luxury                  | Price tier of the product |
| color       | black, white, blue, red, green, yellow, pink, other | Garment color             |
| material    | cotton, wool, polyester, leather, denim, other      | Main material             |
| size        | xs, s, m, l, xl, xxl                                | Size category             |
| style       | casual, formal, sport, vintage, business            | Fashion style             |
| season      | summer, winter, spring, fall, all_season            | Seasonal appropriateness  |
| gender      | men, women, unisex, children                        | Target gender             |

### 3.3 Home & Garden Attributes

| Attribute   | Possible Values                                     | Description               |
| ----------- | --------------------------------------------------- | ------------------------- |
| price_range | budget, mid_range, premium, luxury                  | Price tier of the product |
| color       | black, white, wood, metal, beige, grey, other       | Product color/finish      |
| material    | wood, metal, plastic, glass, fabric, other          | Main material             |
| style       | modern, traditional, minimalist, industrial, rustic | Design style              |
| room        | living, bedroom, kitchen, bathroom, office, outdoor | Intended location         |
| size        | small, medium, large                                | Size category             |

## 4. Price Range Definitions

Price ranges vary by category:

| Category               | Budget | Mid Range | Premium    | Luxury  |
| ---------------------- | ------ | --------- | ---------- | ------- |
| Electronics            | < $100 | $100-$500 | $500-$1000 | > $1000 |
| Clothing               | < $30  | $30-$100  | $100-$300  | > $300  |
| Home & Garden          | < $50  | $50-$200  | $200-$500  | > $500  |
| Beauty & Personal Care | < $15  | $15-$50   | $50-$100   | > $100  |
| Sports & Outdoors      | < $25  | $25-$100  | $100-$300  | > $300  |

## 5. Data Structure

### 5.1 User Schema with Preferences

```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "auth0Id": "auth0|60d21b4667d0d8992e610c85",
  "email": "user@example.com",
  "username": "exampleuser",
  "preferences": [
    {
      "category": "101",
      "score": 0.85,
      "attributes": {
        "price_range": {
          "budget": 0.2,
          "mid_range": 0.7,
          "premium": 0.1,
          "luxury": 0.0
        },
        "brand": {
          "apple": 0.1,
          "samsung": 0.7,
          "other": 0.2
        },
        "color": {
          "black": 0.6,
          "silver": 0.3,
          "other": 0.1
        }
      }
    }
  ],
  "privacySettings": {
    "dataSharingConsent": true,
    "anonymizeData": false,
    "optInStores": ["store123"],
    "optOutStores": []
  },
  "createdAt": "2025-03-15T12:00:00Z",
  "updatedAt": "2025-03-27T10:30:00Z"
}
```

### 5.2 User Data Entry Object

```json
{
  "userId": "60d21b4667d0d8992e610c85",
  "storeId": "store123",
  "email": "user@example.com",
  "dataType": "purchase",
  "entries": [
    {
      "timestamp": "2025-03-27T09:15:00Z",
      "items": [
        {
          "name": "Smartphone XYZ",
          "category": "101",
          "price": 699.99,
          "attributes": {
            "color": "black",
            "brand": "samsung"
          }
        }
      ]
    }
  ],
  "metadata": {
    "source": "mobile_app",
    "deviceType": "ios",
    "sessionId": "sess_12345"
  },
  "processedStatus": "pending",
  "timestamp": "2025-03-27T09:15:00Z"
}
```

## 6. Implementation Guidelines

### 6.1 Category Mapping

When receiving raw categories from external sources:

1. First attempt exact matching with subcategory names
2. If no exact match, use text similarity to find the closest category
3. Default to the main category if no close subcategory match
4. Use "other" (within the appropriate main category) as fallback

### 6.2 Extraction Rules

For **purchase data**:

- Category should be mapped to the taxonomy
- Price should be classified into appropriate range
- Extract explicit attributes like color, brand when available

For **search data**:

- Analyze search terms to extract category information
- Identify qualifiers (like "cheap" → budget price range)
- Extract color, material, or other attribute terms

### 6.3 Preference Calculation

When calculating user preferences:

1. Apply a decay factor to existing preferences (e.g., 0.8)
2. Add new data with normalized importance scores
3. Keep scores bounded between 0.0 and 1.0
4. Calculate attribute preferences separately for each category

## 7. Version History

| Version | Date       | Changes                     |
| ------- | ---------- | --------------------------- |
| 1.0.0   | 2025-03-27 | Initial taxonomy definition |

---

_This taxonomy is maintained by the Tapiro AI Team and should be followed by all components of the platform._
