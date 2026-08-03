// Database layer.
//
// If MONGODB_URI is set (recommended for production — e.g. a free MongoDB
// Atlas cluster), all data is stored persistently in MongoDB, as a single
// document that mirrors the same {users:[...]} shape the rest of the app
// already expects. This survives redeploys and restarts.
//
// If MONGODB_URI is NOT set, falls back to a local JSON file — convenient
// for local development, but NOT safe for production on most hosts (the
// file can be wiped on redeploy/restart).
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_FILE = path.join(__dirname, 'data.json');

let mongoClientPromise = null;
let warnedNoMongo = false;

function getMongoClientPromise() {
  if (!mongoClientPromise) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);
    mongoClientPromise = client.connect().then(() => client);
  }
  return mongoClientPromise;
}

async function getCollection() {
  const client = await getMongoClientPromise();
  return client.db('byteforge').collection('appdata');
}

async function readDB() {
  if (MONGODB_URI) {
    const col = await getCollection();
    let doc = await col.findOne({ _id: 'main' });
    if (!doc) {
      doc = { _id: 'main', users: [] };
      await col.insertOne(doc);
    }
    return doc;
  }

  if (!warnedNoMongo) {
    console.warn('[db] MONGODB_URI not set — using local data.json. This will NOT persist reliably in production (e.g. on Render free tier). Set MONGODB_URI for real deployments.');
    warnedNoMongo = true;
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

async function writeDB(data) {
  if (MONGODB_URI) {
    const col = await getCollection();
    const toSave = Object.assign({}, data, { _id: 'main' });
    await col.replaceOne({ _id: 'main' }, toSave, { upsert: true });
    return;
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
