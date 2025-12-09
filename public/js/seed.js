require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abrilcarchedi_db_user:GZ22MDMYUTM22_m@gym-proyecto.vhxnxsq.mongodb.net/?appName=Gym-proyecto';

// Schemas (copiados del server.js)
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const cartItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 }
});

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema],
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const classSchema = new mongoose.Schema({
    name: { type: String, required: true },
    schedule: { type: String, required: true },
    scheduleDetails: [{
        day: String,
        time: String,
        period: { type: String, enum: ['mañana', 'tarde', 'noche'] }
    }],
    capacity: { type: Number, required: true },
    instructor: { type: String, default: 'Instructor FitZone' },
    duration: { type: String, default: '60 minutos' },
    color: { type: String, default: '#7f4ca5' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    className: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Class = mongoose.model('Class', classSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);

async function seedDatabase() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB');

        // Limpiar datos existentes (opcional - comenta estas líneas si no quieres borrar)
        console.log('🗑️  Limpiando datos anteriores...');
        await User.deleteMany({ role: 'user' }); // No borrar admin
        await Order.deleteMany({});
        await Reservation.deleteMany({});
        
        // Crear usuarios de prueba
        console.log('👥 Creando usuarios de prueba...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const users = await User.insertMany([
            {
                fullName: 'Juan Pérez',
                email: 'juan@test.com',
                phone: '(11) 1234-5678',
                password: hashedPassword,
                role: 'user',
                createdAt: new Date('2024-01-15')
            },
            {
                fullName: 'María González',
                email: 'maria@test.com',
                phone: '(11) 8765-4321',
                password: hashedPassword,
                role: 'user',
                createdAt: new Date('2024-02-20')
            },
            {
                fullName: 'Carlos Rodríguez',
                email: 'carlos@test.com',
                phone: '(11) 5555-6666',
                password: hashedPassword,
                role: 'user',
                createdAt: new Date('2024-03-10')
            },
            {
                fullName: 'Ana Martínez',
                email: 'ana@test.com',
                phone: '(11) 9999-8888',
                password: hashedPassword,
                role: 'user',
                createdAt: new Date('2024-11-01')
            },
            {
                fullName: 'Pedro Sánchez',
                email: 'pedro@test.com',
                phone: '(11) 7777-6666',
                password: hashedPassword,
                role: 'user',
                createdAt: new Date('2024-11-15')
            }
        ]);
        
        console.log(`✅ ${users.length} usuarios creados`);

        // Obtener clases existentes
        const classes = await Class.find({ active: true });
        console.log(`📚 Clases disponibles: ${classes.length}`);

        // Crear reservas de prueba
        if (classes.length > 0) {
            console.log('📅 Creando reservas de prueba...');
            
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            const reservations = [];
            
            // Reservas para diferentes usuarios y clases
            for (let i = 0; i < users.length && i < classes.length; i++) {
                reservations.push({
                    userId: users[i]._id,
                    classId: classes[i % classes.length]._id,
                    className: classes[i % classes.length].name,
                    date: tomorrow,
                    time: '10:00 - 11:00',
                    status: 'active'
                });
                
                reservations.push({
                    userId: users[i]._id,
                    classId: classes[(i + 1) % classes.length]._id,
                    className: classes[(i + 1) % classes.length].name,
                    date: nextWeek,
                    time: '18:00 - 19:00',
                    status: 'active'
                });
            }
            
            await Reservation.insertMany(reservations);
            console.log(`✅ ${reservations.length} reservas creadas`);
        }

        // Crear órdenes de prueba (del mes actual)
        console.log('🛒 Creando órdenes de prueba...');
        
        const orders = [
            {
                userId: users[0]._id,
                items: [
                    { productId: 1, name: 'Proteína Whey', price: 5000, quantity: 2 },
                    { productId: 2, name: 'Creatina', price: 3000, quantity: 1 }
                ],
                total: 13000,
                status: 'completed',
                createdAt: new Date('2024-12-01')
            },
            {
                userId: users[1]._id,
                items: [
                    { productId: 3, name: 'Guantes de Entrenamiento', price: 2500, quantity: 1 }
                ],
                total: 2500,
                status: 'completed',
                createdAt: new Date('2024-12-05')
            },
            {
                userId: users[2]._id,
                items: [
                    { productId: 4, name: 'Shaker', price: 1500, quantity: 2 },
                    { productId: 5, name: 'Toalla Deportiva', price: 1200, quantity: 1 }
                ],
                total: 4200,
                status: 'completed',
                createdAt: new Date('2024-12-07')
            },
            {
                userId: users[0]._id,
                items: [
                    { productId: 6, name: 'Pre-Workout', price: 4500, quantity: 1 }
                ],
                total: 4500,
                status: 'completed',
                createdAt: new Date('2024-12-08')
            }
        ];
        
        await Order.insertMany(orders);
        console.log(`✅ ${orders.length} órdenes creadas`);

        // Mostrar resumen
        console.log('\n📊 RESUMEN DE DATOS CREADOS:');
        console.log(`👥 Usuarios: ${users.length}`);
        console.log(`📅 Reservas: ${await Reservation.countDocuments()}`);
        console.log(`🛒 Órdenes: ${orders.length}`);
        console.log(`💰 Total en ventas: $${orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}`);
        console.log('\n✅ Base de datos poblada exitosamente\n');
        
        console.log('📝 Usuarios de prueba creados:');
        console.log('   juan@test.com / password123');
        console.log('   maria@test.com / password123');
        console.log('   carlos@test.com / password123');
        console.log('   ana@test.com / password123');
        console.log('   pedro@test.com / password123');
        
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error poblando base de datos:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Ejecutar
seedDatabase();