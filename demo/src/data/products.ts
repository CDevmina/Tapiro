// Define the Product interface
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string; // Using placeholders
  categoryId: string; // Crucial: Match IDs from ml-service/app/data/taxonomy.yaml
  attributes?: Record<string, string | number>; // Optional attributes
  description?: string; // Optional description
}

// Sample Product Data (Expand this list significantly)
export const sampleProducts: Product[] = [
  // --- Electronics (100) ---
  {
    id: "p1",
    name: "Pro Smartphone X",
    price: 999,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Smartphone",
    categoryId: "101",
    attributes: { brand: "Apple", color: "black", storage: "256GB", os: "iOS" },
    description: "Latest generation smartphone with advanced camera.",
  },
  {
    id: "p2",
    name: "Budget Android Phone",
    price: 249,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Budget+Phone",
    categoryId: "101",
    attributes: {
      brand: "Samsung",
      color: "blue",
      storage: "128GB",
      os: "Android",
    },
    description: "Affordable and reliable Android device.",
  },
  {
    id: "p3",
    name: 'UltraBook Pro 14"',
    price: 1399,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Laptop",
    categoryId: "102",
    attributes: {
      brand: "Dell",
      usage_type: "business",
      screen_size: "14-inch",
      ram: "16GB",
      storage_type: "SSD",
      os: "Windows",
    },
    description: "Powerful and lightweight laptop for professionals.",
  },
  {
    id: "p4",
    name: 'Gaming Beast Laptop 16"',
    price: 1999,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Gaming+Laptop",
    categoryId: "102",
    attributes: {
      brand: "Asus",
      usage_type: "gaming",
      screen_size: "16-inch",
      ram: "32GB",
      gpu_type: "dedicated_nvidia",
      os: "Windows",
    },
    description: "High-performance gaming laptop with dedicated graphics.",
  },
  {
    id: "p5",
    name: 'Creative Tablet 11"',
    price: 799,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Tablet",
    categoryId: "103",
    attributes: {
      brand: "Apple",
      screen_size: "medium",
      os: "iOS",
      pen_support: "yes",
    },
    description: "Versatile tablet perfect for drawing and notes.",
  },
  {
    id: "p6",
    name: "Fitness Tracker Watch",
    price: 149,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Smartwatch",
    categoryId: "104",
    attributes: {
      brand: "Fitbit",
      type: "fitness_tracker",
      water_resistance: "swimproof",
    },
    description: "Track your steps, heart rate, and sleep.",
  },
  {
    id: "p7",
    name: "Noise Cancelling Headphones",
    price: 349,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Headphones",
    categoryId: "105",
    attributes: {
      brand: "Sony",
      type: "headphones",
      connectivity: "wireless",
      feature: "noise_cancellation",
    },
    description:
      "Immersive audio experience with industry-leading noise cancellation.",
  },
  {
    id: "p8",
    name: "Portable Bluetooth Speaker",
    price: 89,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Speaker",
    categoryId: "105",
    attributes: {
      brand: "JBL",
      type: "speakers",
      connectivity: "bluetooth",
      feature: "water_resistant",
    },
    description: "Compact speaker with great sound for on-the-go.",
  },

  // --- Fashion (200) ---
  {
    id: "p9",
    name: "Classic Cotton T-Shirt",
    price: 25,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=T-Shirt",
    categoryId: "201",
    attributes: {
      type: "t-shirts",
      gender: "unisex",
      material: "cotton",
      color: "white",
      occasion: "casual",
    },
    description: "A wardrobe staple, soft and comfortable.",
  },
  {
    id: "p10",
    name: "Slim Fit Jeans",
    price: 69,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Jeans",
    categoryId: "201",
    attributes: {
      type: "jeans",
      gender: "men",
      material: "denim",
      color: "blue",
      style: "streetwear",
    },
    description: "Modern slim fit jeans for everyday wear.",
  },
  {
    id: "p11",
    name: "Summer Maxi Dress",
    price: 89,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Dress",
    categoryId: "201",
    attributes: {
      type: "dresses",
      gender: "women",
      material: "linen",
      color: "yellow",
      season: "summer",
      occasion: "casual",
    },
    description: "Light and airy dress perfect for warm weather.",
  },
  {
    id: "p12",
    name: "Leather Ankle Boots",
    price: 149,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Boots",
    categoryId: "202",
    attributes: {
      type: "boots",
      gender: "women",
      material: "leather",
      color: "black",
      occasion: "casual",
    },
    description: "Stylish and versatile ankle boots.",
  },
  {
    id: "p13",
    name: "Running Sneakers",
    price: 119,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Sneakers",
    categoryId: "202",
    attributes: {
      type: "athletic",
      gender: "unisex",
      material: "mesh",
      color: "multicolor",
      occasion: "athletic",
    },
    description: "Lightweight sneakers designed for running.",
  },
  {
    id: "p14",
    name: "Kids Graphic Tee",
    price: 15,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Kids+Tee",
    categoryId: "702",
    attributes: {
      age_group: "kids",
      gender: "boy",
      size: "kids_m",
      type: "t-shirt",
    },
    description: "Fun graphic t-shirt for kids.",
  }, // Kids Clothing
  {
    id: "p15",
    name: "Men's Business Suit",
    price: 399,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Suit",
    categoryId: "802",
    attributes: { type: "suit", gender: "men", occasion: "business_formal" },
    description: "Classic two-piece suit for formal business settings.",
  }, // Business Wear

  // --- Home (300) ---
  {
    id: "p16",
    name: "Modern Sofa",
    price: 899,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Sofa",
    categoryId: "301",
    attributes: {
      type: "sofa",
      material: "fabric",
      color: "gray",
      room: "living_room",
      style: "modern",
    },
    description: "Comfortable and stylish sofa for your living room.",
  },
  {
    id: "p17",
    name: "Wooden Dining Table",
    price: 499,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Table",
    categoryId: "301",
    attributes: {
      type: "table",
      material: "wood",
      color: "brown",
      room: "kitchen",
      style: "farmhouse",
    },
    description: "Solid wood dining table for family meals.",
  },
  {
    id: "p18",
    name: "Stainless Steel Cookware Set",
    price: 199,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Cookware",
    categoryId: "302",
    attributes: {
      type: "cookware",
      material: "stainless_steel",
      dishwasher_safe: "yes",
    },
    description: "Durable cookware set for all your cooking needs.",
  },
  {
    id: "p19",
    name: "Smart Coffee Maker",
    price: 129,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Coffee+Maker",
    categoryId: "302",
    attributes: {
      type: "small_appliance",
      brand: "Breville",
      connectivity: "wifi",
    },
    description: "Brew coffee from your phone with this smart maker.",
  },
  {
    id: "p20",
    name: "Gardening Tool Set",
    price: 45,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Garden+Tools",
    categoryId: "303",
    attributes: { type: "tools" },
    description: "Essential tools for your gardening tasks.",
  },
  {
    id: "p21",
    name: "Cordless Power Drill",
    price: 99,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Drill",
    categoryId: "304",
    attributes: { type: "power_tool", brand: "DeWalt" },
    description: "Versatile cordless drill for home improvement.",
  },

  // --- Beauty (400) ---
  {
    id: "p22",
    name: "Hydrating Face Cleanser",
    price: 15,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Cleanser",
    categoryId: "401",
    attributes: {
      type: "cleanser",
      skin_type: "dry",
      ingredient: "hyaluronic_acid",
    },
    description: "Gentle cleanser that hydrates dry skin.",
  },
  {
    id: "p23",
    name: "Vitamin C Serum",
    price: 35,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Serum",
    categoryId: "401",
    attributes: { type: "serum", concern: "dullness", ingredient: "vitamin_c" },
    description: "Brightening serum to improve skin radiance.",
  },
  {
    id: "p24",
    name: "Matte Liquid Foundation",
    price: 40,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Foundation",
    categoryId: "402",
    attributes: {
      type: "foundation",
      finish: "matte",
      coverage: "medium",
      formulation: "liquid",
    },
    description: "Long-lasting foundation with a matte finish.",
  },
  {
    id: "p25",
    name: "Red Lipstick",
    price: 22,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Lipstick",
    categoryId: "402",
    attributes: {
      type: "lipstick",
      color_family: "red",
      finish: "satin",
      formulation: "stick",
    },
    description: "Classic red lipstick with a satin finish.",
  },

  // --- Media (500) ---
  {
    id: "p26",
    name: "Bestseller Fiction Novel",
    price: 18,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Book",
    categoryId: "501",
    attributes: { format: "paperback", genre: "mystery", bestseller: "yes" },
    description: "A thrilling mystery novel topping the charts.",
  },
  {
    id: "p27",
    name: "Classic Sci-Fi Movie (Blu-ray)",
    price: 25,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Movie",
    categoryId: "502",
    attributes: {
      format: "blu_ray",
      genre: "science_fiction",
      release_timeframe: "classic",
    },
    description: "A timeless science fiction masterpiece on Blu-ray.",
  },
  {
    id: "p28",
    name: "Video Streaming Subscription",
    price: 15,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Streaming",
    categoryId: "503",
    attributes: { service_type: "video", provider: "Netflix" },
    description: "Monthly subscription for unlimited movies and TV shows.",
  },

  // --- Health & Wellness (600) ---
  {
    id: "p29",
    name: "Daily Multivitamin Gummies",
    price: 20,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Vitamins",
    categoryId: "601",
    attributes: { type: "multivitamin", form: "gummy" },
    description: "Easy-to-take daily multivitamins.",
  },
  {
    id: "p30",
    name: "Electric Toothbrush",
    price: 75,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Toothbrush",
    categoryId: "602",
    attributes: { type: "oral_care" },
    description: "Advanced cleaning for healthier gums.",
  },

  // --- Toys & Games (700) ---
  {
    id: "p31",
    name: "Building Blocks Set (Large)",
    price: 55,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Blocks",
    categoryId: "700",
    attributes: { type: "building_blocks", age_range: "3-5" },
    description: "Large building blocks set for creative play.",
  },
  {
    id: "p32",
    name: "Baby Stroller System",
    price: 299,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Stroller",
    categoryId: "701",
    attributes: { type: "stroller", brand: "Graco" },
    description: "Versatile stroller system for infants and toddlers.",
  },

  // --- Office Supplies (800) ---
  {
    id: "p33",
    name: "Gel Pens (12-Pack)",
    price: 12,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Pens",
    categoryId: "801",
    attributes: { type: "pen" },
    description: "Smooth writing gel pens in assorted colors.",
  },

  // --- Gaming (900) ---
  {
    id: "p34",
    name: "Wireless Gaming Mouse",
    price: 59,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Gaming+Mouse",
    categoryId: "900",
    attributes: { type: "accessory", platform: "pc" },
    description: "High-precision wireless mouse for gaming.",
  },
  {
    id: "p35",
    name: "Indie Puzzle Game (PC)",
    price: 19,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=PC+Game",
    categoryId: "900",
    attributes: { type: "game", platform: "pc", genre: "puzzle" },
    description: "Challenging and unique indie puzzle game.",
  },

  // --- Travel (1000) ---
  {
    id: "p36",
    name: "Carry-On Suitcase",
    price: 120,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Suitcase",
    categoryId: "1000",
    attributes: { type: "luggage", travel_style: "business" },
    description: "Durable carry-on suitcase for business trips.",
  },

  // --- Grocery (1100) ---
  {
    id: "p37",
    name: "Organic Apples (3lb Bag)",
    price: 6,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Apples",
    categoryId: "1100",
    attributes: { category: "fresh_produce", dietary_preference: "organic" },
    description: "Fresh, crisp organic apples.",
  },
  {
    id: "p38",
    name: "Canned Tuna Value Pack",
    price: 5,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Tuna",
    categoryId: "1101",
    attributes: { type: "canned_goods" },
    description: "Value pack of canned tuna.",
  }, // Budget Food

  // --- Jewelry & Watches (1200) ---
  {
    id: "p39",
    name: "Silver Necklace",
    price: 75,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Necklace",
    categoryId: "1200",
    attributes: {
      type: "necklace",
      material: "silver",
      price_range: "mid_range",
      gender: "women",
    },
    description: "Elegant sterling silver necklace.",
  },

  // --- Gifts (1300) ---
  {
    id: "p40",
    name: "Birthday Gift Basket",
    price: 50,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Gift+Basket",
    categoryId: "1300",
    attributes: {
      occasion: "birthday",
      recipient: "for_her",
      type: "gift_basket",
    },
    description: "A curated gift basket perfect for birthdays.",
  },

  // --- Software (1400) ---
  {
    id: "p41",
    name: "Productivity Suite (Subscription)",
    price: 99,
    imageUrl: "https://via.placeholder.com/300x200/eee/aaa?text=Software",
    categoryId: "1400",
    attributes: {
      type: "productivity",
      license: "subscription",
      platform: "web",
    },
    description: "Annual subscription for office productivity software.",
  },
];
