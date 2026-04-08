const mongoose = require('mongoose');
const { ProductModel } = require('./src/models/product');
const { CategoryModel } = require('./src/models/category');
require('dotenv').config();

const SAMPLE_PRODUCTS = [
  {
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 2999,
    originalPrice: 3999,
    stock: 50,
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  },
  {
    name: 'Smart Watch Pro',
    description: 'Advanced smartwatch with health monitoring features',
    price: 4499,
    originalPrice: 5999,
    stock: 30,
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  },
  {
    name: 'Leather Laptop Bag',
    description: 'Premium leather laptop bag for professionals',
    price: 1899,
    originalPrice: 2499,
    stock: 25,
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof bluetooth speaker with 20-hour battery',
    price: 1299,
    originalPrice: 1799,
    stock: 60,
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
  },
  {
    name: 'Canvas Backpack',
    description: 'Durable canvas backpack for travel',
    price: 899,
    originalPrice: 1299,
    stock: 40,
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical gaming keyboard',
    price: 1799,
    originalPrice: 2499,
    stock: 35,
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
  }
];

const SAMPLE_CATEGORIES = [
  { name: 'Electronics', active: true, order: 1 },
  { name: 'Fashion', active: true, order: 2 },
  { name: 'Home & Decor', active: true, order: 3 },
  { name: 'Accessories', active: true, order: 4 }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Create categories if none exist
    const existingCategories = await CategoryModel.find({});
    let categories = existingCategories;
    
    if (existingCategories.length === 0) {
      console.log('📂 Creating categories...');
      categories = await CategoryModel.insertMany(SAMPLE_CATEGORIES);
      console.log(`✅ Created ${categories.length} categories`);
    } else {
      console.log(`📂 Using ${existingCategories.length} existing categories`);
    }

    // Check existing products
    const existingProducts = await ProductModel.find({});
    
    if (existingProducts.length > 0) {
      console.log(`\n📦 ${existingProducts.length} products already exist`);
      console.log('Use --force to add more sample products\n');
      
      if (!process.argv.includes('--force')) {
        return;
      }
    }

    // Create products with category assignments
    console.log('\n📦 Creating sample products...');
    
    const productsToCreate = SAMPLE_PRODUCTS.map((prod, index) => ({
      ...prod,
      categoryId: categories[index % categories.length]._id,
      sku: `SKU-${Date.now()}-${index}`
    }));

    const createdProducts = await ProductModel.insertMany(productsToCreate);
    console.log(`✅ Created ${createdProducts.length} products`);

    // Display created products
    console.log('\n📋 Created Products:');
    createdProducts.forEach((prod, i) => {
      console.log(`  ${i + 1}. ${prod.name} - ₹${prod.price}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedDatabase();
