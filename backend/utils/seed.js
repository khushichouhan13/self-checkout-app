import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';
import connectDB from '../config/db.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing collections
    await User.deleteMany();
    await Product.deleteMany();
    console.log('[Seeder] Cleared existing Users and Products.');

    // Seed test users (Customer and Admin)
    const adminUser = await User.create({
      name: 'Store Administrator',
      email: 'admin@store.com',
      password: 'admin123',
      role: 'admin',
    });

    const standardUser = await User.create({
      name: 'John Customer',
      email: 'user@store.com',
      password: 'user123',
      role: 'user',
    });

    console.log('[Seeder] Seeded default User accounts:');
    console.log(` - Admin: admin@store.com (password: admin123)`);
    console.log(` - User: user@store.com (password: user123)`);

    // Seed mock products
    const products = [
      {
        name: 'Dark Roast Organic Coffee Beans (500g)',
        price: 1299,
        barcode: '101',
        image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=400',
        stock: 50,
      },
      {
        name: 'Fiji Natural Artesian Water (1L)',
        price: 249,
        barcode: '102',
        image: 'https://images.unsplash.com/photo-1608885898957-a599fb18efeb?auto=format&fit=crop&q=80&w=400',
        stock: 120,
      },
      {
        name: 'Whole Grain Almond Granola (400g)',
        price: 499,
        barcode: '103',
        image: 'https://images.unsplash.com/photo-1517881917430-e70dfb3610aa?auto=format&fit=crop&q=80&w=400',
        stock: 80,
      },
      {
        name: 'Salted Caramel Dark Chocolate Bar (100g)',
        price: 379,
        barcode: '104',
        image: 'https://images.unsplash.com/photo-1549007994-cb92ca817bc7?auto=format&fit=crop&q=80&w=400',
        stock: 150,
      },
      {
        name: 'Organic Extra Virgin Olive Oil (750ml)',
        price: 1549,
        barcode: '105',
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400',
        stock: 35,
      },
      {
        name: 'Fresh Hydroponic Strawberries (250g)',
        price: 599,
        barcode: '106',
        image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=400',
        stock: 40,
      }
    ];

    await Product.insertMany(products);
    console.log(`[Seeder] Seeded ${products.length} mock store products with barcodes 101 through 106.`);

    console.log('[Seeder] Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder] Seeding failure: ${error.message}`);
    process.exit(1);
  }
};

seedData();
