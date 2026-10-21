// Quick database connection tester for MongoDB Atlas
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('\x1b[31m[ERROR] MONGODB_URI is not defined in your .env file!\x1b[0m');
  process.exit(1);
}

// Mask password for safe logging
const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
console.log(`Connecting to: ${maskedUri}`);

mongoose
  .connect(uri)
  .then(() => {
    console.log('\x1b[32m[SUCCESS] Successfully connected to MongoDB Atlas!\x1b[0m');
    console.log(`[INFO] Database Name: ${mongoose.connection.name}`);
    console.log(`[INFO] Ready State: Connected (1)`);
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('\x1b[32m[INFO] Disconnected cleanly. Your MongoDB Atlas connection is working!\x1b[0m');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\x1b[31m[ERROR] Connection failed:\x1b[0m', err.message);

    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('\n\x1b[33m--- TROUBLESHOOTING TIP ---');
      console.error('1. Check that the username and password in MONGODB_URI are correct.');
      console.error('2. In MongoDB Atlas, go to "Database Access" and verify the user exists.');
      console.error('3. If your password contains special characters (like @, #, $, %, etc.), URL-encode them.\x1b[0m');
    } else if (err.name === 'MongooseServerSelectionError' || err.message.includes('ETIMEDOUT')) {
      console.error('\n\x1b[33m--- TROUBLESHOOTING TIP ---');
      console.error('1. Your IP address may not be whitelisted in MongoDB Atlas.');
      console.error('2. Go to MongoDB Atlas -> "Network Access" -> click "Add IP Address".');
      console.error('3. Choose "Allow Access From Anywhere" (0.0.0.0/0) or "Add Current IP Address".\x1b[0m');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('\n\x1b[33m--- TROUBLESHOOTING TIP ---');
      console.error('1. DNS SRV lookup failed. Check the hostname in your connection string.\x1b[0m');
    }

    process.exit(1);
  });
