/**
 * Script to reset passwords for admin and user to "123456"
 * Run: node scripts/reset-passwords.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { UserModel } = require('../src/models/user');
const { AdminModel } = require('../src/models/admin');

const NEW_PASSWORD = '123456';

async function resetPasswords() {
    try {
        // Connect to MongoDB
        const mongoUri = "mongodb+srv://ikolyra:vfchjH3asjxlwN0g@ikolyra.xguwgzj.mongodb.net/ikolyra?retryWrites=true&w=majority&appName=ikolyra";
        await mongoose.connect(mongoUri);
        console.log('Connected to database:\n', mongoUri);

        // Hash the new password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

        console.log('\n========================================');
        console.log('RESETTING PASSWORDS TO: 123456');
        console.log('========================================\n');

        // Reset ADMIN password
        console.log('🔴 Resetting ADMIN password...');
        const adminUpdate = await AdminModel.updateMany(
            {},
            { $set: { password: hashedPassword } }
        );
        console.log(`  ✓ Admin passwords reset: ${adminUpdate.modifiedCount} account(s)`);

        // Reset USER password
        console.log('\n🔵 Resetting USER passwords...');
        const userUpdate = await UserModel.updateMany(
            {},
            { $set: { password: hashedPassword } }
        );
        console.log(`  ✓ User passwords reset: ${userUpdate.modifiedCount} account(s)`);

        // Verify the changes
        console.log('\n========================================');
        console.log('VERIFICATION');
        console.log('========================================');

        const admin = await AdminModel.findOne().select('+password');
        if (admin) {
            const isMatch = await bcrypt.compare(NEW_PASSWORD, admin.password);
            console.log(`\nAdmin (${admin.email}):`);
            console.log(`  New Password: ${NEW_PASSWORD}`);
            console.log(`  Verification: ${isMatch ? '✓ PASSWORD MATCHES' : '✗ FAILED'}`);
        }

        const user = await UserModel.findOne().select('+password');
        if (user) {
            const isMatch = await bcrypt.compare(NEW_PASSWORD, user.password);
            console.log(`\nUser (${user.email}):`);
            console.log(`  New Password: ${NEW_PASSWORD}`);
            console.log(`  Verification: ${isMatch ? '✓ PASSWORD MATCHES' : '✗ FAILED'}`);
        }

        console.log('\n========================================');
        console.log('✅ PASSWORDS RESET SUCCESSFULLY');
        console.log('========================================');
        console.log('\nLogin credentials:');
        console.log('  Admin: ikolyra7274@gmail.com / 123456');
        console.log('  User:  khush@gmail.com / 123456');

    } catch (error) {
        console.error('Error resetting passwords:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from database');
        process.exit(0);
    }
}

// Run the script
resetPasswords();
