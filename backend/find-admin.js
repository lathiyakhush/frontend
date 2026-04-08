const mongoose = require('mongoose');
const { AdminModel } = require('./src/models/admin');
require('dotenv').config();

async function findAdminUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all admin users
    const admins = await AdminModel.find({});
    
    if (admins.length === 0) {
      console.log('❌ No admin users found in database');
      return;
    }

    console.log(`\n📋 Found ${admins.length} admin user(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`Admin #${index + 1}:`);
      console.log(`  ID: ${admin._id}`);
      console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Phone: ${admin.phone || 'N/A'}`);
      console.log(`  Created: ${admin.createdAt || 'N/A'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error finding admin users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Search by specific email if provided
async function findAdminByEmail(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const admin = await AdminModel.findOne({ email: email });
    
    if (!admin) {
      console.log(`❌ No admin found with email: ${email}`);
      return;
    }

    console.log('\n📋 Admin found:\n');
    console.log(`  ID: ${admin._id}`);
    console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Phone: ${admin.phone || 'N/A'}`);
    console.log(`  Password hash exists: ${!!admin.password}`);
    console.log(`  Created: ${admin.createdAt || 'N/A'}`);

  } catch (error) {
    console.error('❌ Error finding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
const emailArg = process.argv[2];

if (emailArg) {
  console.log(`🔍 Searching for admin with email: ${emailArg}`);
  findAdminByEmail(emailArg);
} else {
  console.log('🔍 Searching for all admin users...');
  findAdminUsers();
}
