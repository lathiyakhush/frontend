const mongoose = require('mongoose');
const { ProductModel } = require('./src/models/product');
const { CategoryModel } = require('./src/models/category');
require('dotenv').config();

async function checkProductsAndCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check categories
    const categories = await CategoryModel.find({});
    console.log(`📂 Total Categories: ${categories.length}`);
    
    if (categories.length === 0) {
      console.log('❌ No categories found! Products need categories to display.');
    } else {
      console.log('\n📋 Categories:');
      categories.forEach((cat, i) => {
        console.log(`  ${i + 1}. ${cat.name} (ID: ${cat._id}, Active: ${cat.active})`);
      });
    }

    // Check products
    const products = await ProductModel.find({});
    console.log(`\n📦 Total Products: ${products.length}`);
    
    if (products.length === 0) {
      console.log('❌ No products found in database!');
    } else {
      console.log('\n📋 Sample Products (first 5):');
      products.slice(0, 5).forEach((prod, i) => {
        console.log(`  ${i + 1}. ${prod.name} (ID: ${prod._id}, Active: ${prod.active}, Category: ${prod.categoryId || prod.category || 'N/A'})`);
      });
      
      // Check active products with categories
      const activeProducts = products.filter(p => p.active);
      console.log(`\n✅ Active Products: ${activeProducts.length}`);
    }

    // Check if products have category assignments
    const productsWithCategory = products.filter(p => p.categoryId || p.category);
    console.log(`\n🔗 Products with Category: ${productsWithCategory.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkProductsAndCategories();
