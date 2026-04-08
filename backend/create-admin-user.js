const mongoose = require('mongoose');
const { AdminModel } = require('./src/models/admin');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await AdminModel.findOne({ email: 'ikolyra7274@gmail.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Email: ikolyra7274@gmail.com');
      console.log('Password: Fytrq@$#47332');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const adminUser = new AdminModel({
      firstName: 'Ikolyra',
      lastName: 'Admin',
      email: 'ikolyra7274@gmail.com',
      password: 'Fytrq@$#47332',
      phone: '9876543210'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('Email: ikolyra7274@gmail.com');
    console.log('Password: Fytrq@$#47332');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUser();
