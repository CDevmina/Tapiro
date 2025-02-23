const { connectDB, getDB } = require('../utils/mongoUtil');

async function migrateData() {
  try {
    await connectDB();
    const db = getDB();

    // Add timestamps to existing documents
    await db
      .collection('users')
      .updateMany(
        { createdAt: { $exists: false } },
        { $set: { createdAt: new Date(), updatedAt: new Date() } },
      );

    // Add status field to advertisements
    await db
      .collection('advertisements')
      .updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
