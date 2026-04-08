/**
 * Script to fetch all users and admins with passwords from database
 * Run: node scripts/get-users-with-passwords.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { UserModel } = require('../src/models/user');
const { AdminModel } = require('../src/models/admin');

async function getUsersAndAdminsWithPasswords() {
    try {
        // Connect to MongoDB
        const mongoUri = "mongodb+srv://ikolyra:vfchjH3asjxlwN0g@ikolyra.xguwgzj.mongodb.net/ikolyra?retryWrites=true&w=majority&appName=ikolyra";
        await mongoose.connect(mongoUri);
        console.log('Connected to database:', mongoUri);

        // Fetch ADMINS with password field included
        console.log('\n🔴 ========================================');
        console.log('ADMINS');
        console.log('========================================');
        const admins = await AdminModel.find({})
            .select('+password')
            .lean();

        console.log(`Total Admins Found: ${admins.length}\n`);

        if (admins.length === 0) {
            console.log('No admins found in database.');
        } else {
            admins.forEach((admin, index) => {
                console.log(`\n--- Admin ${index + 1} ---`);
                console.log('ID:', admin._id);
                console.log('Name:', `${admin.firstName} ${admin.lastName}`);
                console.log('Email:', admin.email);
                console.log('Password Hash:', admin.password || 'NO PASSWORD SET');
                console.log('Phone:', admin.phone || 'N/A');
                console.log('Role:', admin.role);
                console.log('Active:', admin.active);
                console.log('Created At:', admin.createdAt);
                console.log('Last Login:', admin.lastLogin || 'Never');
            });
        }

        // Fetch USERS with password field included
        console.log('\n🔵 ========================================');
        console.log('USERS');
        console.log('========================================');
        const users = await UserModel.find({})
            .select('+password +otpHash +resetPasswordTokenHash')
            .lean();

        console.log(`Total Users Found: ${users.length}\n`);

        if (users.length === 0) {
            console.log('No users found in database.');
        } else {
            users.forEach((user, index) => {
                console.log(`\n--- User ${index + 1} ---`);
                console.log('ID:', user._id);
                console.log('Name:', `${user.firstName} ${user.lastName}`);
                console.log('Email:', user.email);
                console.log('Password Hash:', user.password || 'NO PASSWORD SET');
                console.log('Phone:', user.phone || 'N/A');
                console.log('Role:', user.role);
                console.log('Active:', user.active);
                console.log('Created At:', user.createdAt);
                console.log('Last Login:', user.lastLogin || 'Never');
                
                if (user.otpHash) {
                    console.log('OTP Hash:', user.otpHash);
                }
                if (user.resetPasswordTokenHash) {
                    console.log('Reset Password Token:', user.resetPasswordTokenHash);
                }
            });
        }

        // Export to JSON file
        const fs = require('fs');
        const exportData = {
            admins: admins.map(admin => ({
                id: admin._id.toString(),
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                passwordHash: admin.password || null,
                phone: admin.phone,
                role: admin.role,
                active: admin.active,
                createdAt: admin.createdAt,
                lastLogin: admin.lastLogin
            })),
            users: users.map(user => ({
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                passwordHash: user.password || null,
                phone: user.phone,
                role: user.role,
                active: user.active,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                otpHash: user.otpHash || null,
                resetPasswordTokenHash: user.resetPasswordTokenHash || null
            }))
        };

        const filename = `all-accounts-export-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`\n✅ Data exported to: ${filename}`);

        // Summary
        console.log('\n========================================');
        console.log('FINAL SUMMARY:');
        console.log('========================================');
        console.log(`Total Admins: ${admins.length}`);
        console.log(`  - With Password: ${admins.filter(a => a.password).length}`);
        console.log(`  - Without Password: ${admins.filter(a => !a.password).length}`);
        console.log(`Total Users: ${users.length}`);
        console.log(`  - With Password: ${users.filter(u => u.password).length}`);
        console.log(`  - Without Password: ${users.filter(u => !u.password).length}`);
        console.log(`  - Active: ${users.filter(u => u.active).length}`);
        console.log(`  - Inactive: ${users.filter(u => !u.active).length}`);
        console.log(`\nTOTAL ACCOUNTS: ${admins.length + users.length}`);

    } catch (error) {
        console.error('Error fetching accounts:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from database');
        process.exit(0);
    }
}

// Run the script
getUsersAndAdminsWithPasswords();
