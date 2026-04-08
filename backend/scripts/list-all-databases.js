/**
 * Script to list all databases and collections
 * Run: node scripts/list-all-databases.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function listDatabases() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ikolyra';
        const conn = await mongoose.createConnection(mongoUri).asPromise();
        
        // List all databases
        const adminDb = conn.useDb('admin');
        const dbs = await adminDb.db.admin().listDatabases();
        
        console.log('\n=== AVAILABLE DATABASES ===');
        for (const db of dbs.databases) {
            console.log(`\n📁 ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
            
            // Connect to each DB and list collections
            try {
                const dbConn = conn.useDb(db.name);
                const collections = await dbConn.db.listCollections().toArray();
                
                for (const col of collections) {
                    const count = await dbConn.collection(col.name).countDocuments();
                    console.log(`   └─ 📄 ${col.name}: ${count} documents`);
                }
            } catch (e) {
                console.log(`   └─ Error: ${e.message}`);
            }
        }
        
        await conn.close();
        console.log('\n✅ Done');
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

listDatabases();
