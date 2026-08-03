// Load environment variables from .env file
const path = require('path');
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// Verify JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error('[Backend] ERROR: JWT_SECRET is not defined in .env file');
  console.error('[Backend] Please add JWT_SECRET to backend/.env');
  process.exit(1);
}
console.log('[Backend] ✓ JWT Secret Loaded');

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets/index');
const Doctor = require('./models/Doctor');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io); // Make io accessible in controllers

// Seed default doctor if none exists
const seedDefaultDoctor = async () => {
  try {
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      await Doctor.create({
        doctorId: 'DR-1042',
        name: 'Dr. Elena Marquez',
        email: 'elena.marquez@novadx.io',
        password: 'password123',
        specialization: 'Radiologist & Oncologist',
        hospital: 'Northwell Medical Center',
        department: 'Neuro Oncology',
        experience: '14 years',
        qualifications: [
          'MD, Radiology',
          'PhD, Biomedical Imaging',
          'Fellowship, Neuro Oncology',
        ],
        license: 'MD-884221',
        phone: '+1 (212) 555-0188',
        avatar: 'EM',
      });
      console.log('Default doctor seeded successfully');
      console.log('  Email: elena.marquez@novadx.io');
      console.log('  Password: password123');
    }
  } catch (error) {
    console.error('Error seeding default doctor:', error.message);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed default data
    await seedDefaultDoctor();

    // Start listening
    server.listen(PORT, () => {
      console.log(`\n[Backend] NovaDx Backend Server`);
      console.log(`   Port: ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

