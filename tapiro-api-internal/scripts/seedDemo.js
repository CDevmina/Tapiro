/* eslint-disable no-console */
/**
 * Seeds the public demo: a demo user, a demo store with an API key, and a
 * few weeks of sample purchases and searches sent through the store API so
 * ml-service builds real preferences for the demo user.
 *
 * Safe to run again. Each run resets the demo user's data and preferences.
 *
 * Required:
 *   MONGODB_URI, DB_NAME (default tapiro)
 *   EXTERNAL_API_URL      store API base URL (default http://localhost:3001)
 *   DEMO_USER_PASSWORD, DEMO_STORE_PASSWORD
 *   DEMO_STORE_API_KEY    64 hex chars. Generate with: openssl rand -hex 32
 *   AUTH0_ISSUER_BASE_URL, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET,
 *   AUTH0_USER_ROLE_ID, AUTH0_STORE_ROLE_ID
 *
 * Optional:
 *   DEMO_USER_EMAIL       default demo.user@tapiro.demo
 *   DEMO_STORE_EMAIL      default demo.store@tapiro.demo
 *   SKIP_AUTH0=1          skip Auth0 and use placeholder ids (local testing)
 */
try { require('dotenv').config(); } catch (e) { /* dotenv is optional */ }
const crypto = require('crypto');
const axios = require('axios');
const { MongoClient, ObjectId } = require('mongodb');

const env = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (value === undefined) throw new Error(`${name} is not set`);
  return value;
};

const SKIP_AUTH0 = process.env.SKIP_AUTH0 === '1';
const USER_EMAIL = env('DEMO_USER_EMAIL', 'demo.user@tapiro.demo');
const STORE_EMAIL = env('DEMO_STORE_EMAIL', 'demo.store@tapiro.demo');
const EXTERNAL_API_URL = env('EXTERNAL_API_URL', 'http://localhost:3001').replace(/\/$/, '');

// ---------- Auth0 ----------

async function auth0Client() {
  const issuer = env('AUTH0_ISSUER_BASE_URL').replace(/\/$/, '');
  const { data } = await axios.post(`${issuer}/oauth/token`, {
    client_id: env('AUTH0_M2M_CLIENT_ID'),
    client_secret: env('AUTH0_M2M_CLIENT_SECRET'),
    audience: `${issuer}/api/v2/`,
    grant_type: 'client_credentials',
  });
  return axios.create({
    baseURL: `${issuer}/api/v2`,
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
}

async function upsertAuth0User(api, { email, password, roleId, type, nickname }) {
  const { data: found } = await api.get('/users-by-email', { params: { email } });
  let user = found[0];
  if (!user) {
    ({ data: user } = await api.post('/users', {
      connection: 'Username-Password-Authentication',
      email,
      password,
      email_verified: true,
    }));
    console.log(`Created Auth0 user ${email}`);
  } else {
    await api.patch(`/users/${encodeURIComponent(user.user_id)}`, { password });
    console.log(`Reset password for Auth0 user ${email}`);
  }
  await api.post(`/users/${encodeURIComponent(user.user_id)}/roles`, { roles: [roleId] });
  await api.patch(`/users/${encodeURIComponent(user.user_id)}`, {
    user_metadata: { registrationType: type, registrationComplete: true, nickname, isDemo: true },
  });
  return user.user_id;
}

// ---------- Sample data ----------

const PRODUCTS = [
  { sku: 'p4', name: 'Gaming Beast Laptop 16"', category: '102', price: 1999,
    attributes: { brand: 'Asus', usage_type: 'gaming', ram: '32GB', gpu_type: 'dedicated_nvidia' } },
  { sku: 'p1', name: 'Pro Smartphone X', category: '101', price: 999,
    attributes: { brand: 'Apple', color: 'black', storage: '256GB', os: 'iOS' } },
  { sku: 'mouse', name: 'Gaming Mouse', category: 'Gaming Accessories', price: 59,
    attributes: { brand: 'Logitech', color: 'black' } },
  { sku: 'headphones', name: 'Noise Cancelling Headphones', category: 'Audio', price: 299,
    attributes: { brand: 'Sony', color: 'black' } },
  { sku: 'coffee', name: 'Single Origin Coffee Beans', category: 'Groceries', price: 18,
    attributes: {} },
  { sku: 'sneakers', name: 'Running Sneakers', category: 'Shoes', price: 120,
    attributes: { brand: 'Nike', color: 'white', size: '42' } },
];

const SEARCHES = ['gaming laptop rtx', 'mechanical keyboard', 'wireless earbuds', 'running shoes', 'espresso beans'];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function samplePurchases() {
  // One basket every few days over the last month
  const baskets = [[0, 2], [3], [1, 4], [5], [2, 3], [4]];
  return baskets.map((idxs, i) => {
    const items = idxs.map((idx) => ({ ...PRODUCTS[idx], quantity: 1 }));
    return {
      timestamp: daysAgo(28 - i * 5),
      items,
      totalValue: items.reduce((sum, item) => sum + item.price, 0),
    };
  });
}

function sampleSearches() {
  return SEARCHES.map((query, i) => ({ timestamp: daysAgo(20 - i * 4), query, results: 12 }));
}

// ---------- Main ----------

async function main() {
  const apiKey = env('DEMO_STORE_API_KEY');
  if (!/^[0-9a-f]{64}$/.test(apiKey)) throw new Error('DEMO_STORE_API_KEY must be 64 hex characters');

  let userAuth0Id = 'auth0|demo-user-local';
  let storeAuth0Id = 'auth0|demo-store-local';
  if (!SKIP_AUTH0) {
    const api = await auth0Client();
    userAuth0Id = await upsertAuth0User(api, {
      email: USER_EMAIL, password: env('DEMO_USER_PASSWORD'), roleId: env('AUTH0_USER_ROLE_ID'),
      type: 'user', nickname: 'demo_user',
    });
    storeAuth0Id = await upsertAuth0User(api, {
      email: STORE_EMAIL, password: env('DEMO_STORE_PASSWORD'), roleId: env('AUTH0_STORE_ROLE_ID'),
      type: 'store', nickname: 'Tapiro Demo Store',
    });
  }

  const client = new MongoClient(env('MONGODB_URI'));
  await client.connect();
  const db = client.db(env('DB_NAME', 'tapiro'));
  const now = new Date();

  await db.collection('users').updateOne(
    { email: USER_EMAIL },
    {
      $set: {
        auth0Id: userAuth0Id,
        username: 'demo_user',
        email: USER_EMAIL,
        preferences: [],
        demographicData: {
          gender: null, incomeBracket: null, country: 'LK', age: null, hasKids: null,
          relationshipStatus: null, employmentStatus: null, educationLevel: null,
          inferredHasKids: null, inferredRelationshipStatus: null, inferredEmploymentStatus: null,
          inferredEducationLevel: null, inferredGender: null,
        },
        privacySettings: {
          dataSharingConsent: true, anonymizeData: false, allowInference: true,
          optInStores: [], optOutStores: [],
        },
        isDemo: true,
        updatedAt: now,
      },
      $setOnInsert: { phone: null, createdAt: now },
    },
    { upsert: true },
  );
  const user = await db.collection('users').findOne({ email: USER_EMAIL });
  await db.collection('userData').deleteMany({ $or: [{ userId: user._id }, { email: USER_EMAIL }] });

  const apiKeyDoc = {
    keyId: new ObjectId().toString(),
    prefix: apiKey.substring(0, 8),
    hashedKey: crypto.createHash('sha256').update(apiKey).digest('hex'),
    name: 'Demo store key',
    status: 'active',
    createdAt: now,
  };
  await db.collection('stores').updateOne(
    { email: STORE_EMAIL },
    {
      $set: {
        auth0Id: storeAuth0Id,
        name: 'Tapiro Demo Store',
        address: 'Colombo, Sri Lanka',
        email: STORE_EMAIL,
        apiKeys: [apiKeyDoc],
        isDemo: true,
        updatedAt: now,
      },
      $setOnInsert: { webhooks: [], createdAt: now },
    },
    { upsert: true },
  );
  await client.close();
  console.log('Upserted demo user and store in MongoDB');

  const store = axios.create({ baseURL: EXTERNAL_API_URL, headers: { 'X-API-Key': apiKey } });
  for (const [dataType, entries] of [['purchase', samplePurchases()], ['search', sampleSearches()]]) {
    const { status } = await store.post('/users/data', {
      email: USER_EMAIL, dataType, entries, metadata: { source: 'seed-demo' },
    });
    console.log(`Submitted ${entries.length} ${dataType} entries (HTTP ${status})`);
  }

  // Processing runs in the background; wait for preferences to appear
  for (let i = 0; i < 20; i += 1) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const { data } = await store.get(`/users/${encodeURIComponent(USER_EMAIL)}/preferences`);
      if (data.preferences && data.preferences.length) {
        console.log(`Demo user now has ${data.preferences.length} preferences`);
        return;
      }
    } catch (err) {
      // not ready yet
    }
  }
  throw new Error('Preferences did not appear within 60 seconds');
}

main().catch((err) => {
  console.error(err.response?.data || err);
  process.exit(1);
});
