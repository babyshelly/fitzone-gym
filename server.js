const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar sesiones
app.use(session({
    secret: 'fitzone-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Schema del Usuario
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Schema de Clases
// ==================== TAMBIÉN ACTUALIZAR EL classSchema ====================
// Busca el classSchema existente y REEMPLÁZALO con este:

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    schedule: {
        type: String,
        required: true
    },
    scheduleDetails: [{
        day: String,
        time: String,
        period: { type: String, enum: ['mañana', 'tarde', 'noche'] }
    }],
    capacity: {
        type: Number,
        required: true
    },
    instructor: {
        type: String,
        default: 'Instructor FitZone'
    },
    duration: {
        type: String,
        default: '60 minutos'
    },
    color: {
        type: String,
        default: '#7f4ca5'
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Schema de Reservas
const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    className: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

// Schema del Carrito
const cartItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 }
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    updatedAt: { type: Date, default: Date.now }
});

const Cart = mongoose.model('Cart', cartSchema);

// Schema de Órdenes
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema],
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ==================== AGREGAR ESTOS SCHEMAS DESPUÉS DEL SCHEMA DE ORDER EN server.js ====================

// Schema de Membresía
const membershipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    planType: {
    type: String,
    enum: ['mes-libre', 'dos-personas', 'tres-veces', 'semanal', 'dia-clase', 'jubilados'],
    required: true
    },
    price: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'pending'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['efectivo', 'transferencia', 'tarjeta', 'mercadopago'],
        required: true
    },
    trainingDays: [{
        type: String,
        enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    }],
    // Para membresía de jubilados
    verificationData: {
        dni: String,
        age: Number,
        gender: String
    },
    // Para membresía de 2 personas
    sharedMembership: {
        isShared: { type: Boolean, default: false },
        membershipCode: String,
        mainUserId: mongoose.Schema.Types.ObjectId,
        secondUserId: mongoose.Schema.Types.ObjectId,
        secondUserActivated: { type: Boolean, default: false }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    renewalNotificationSent: {
        type: Boolean,
        default: false
    }
});

const Membership = mongoose.model('Membership', membershipSchema);

// Schema para Datos Pendientes de Usuario (para membresía de 2 personas)
const pendingUserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    membershipCode: { type: String, required: true },
    mainUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000 // 30 días
    }
});

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);

// Schema de Notificaciones
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['membership_expiring', 'membership_expired', 'payment_reminder', 'general'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model('Notification', notificationSchema);

// ==================== EXPORTAR LOS MODELOS ====================
// Agregar al final de donde están los otros modelos
// module.exports = { User, Class, Reservation, Cart, Order, Membership, PendingUser, Notification };

// Inicializar datos predefinidos
// ==================== REEMPLAZAR LA FUNCIÓN initializeData() EN server.js ====================

async function initializeData() {
    try {
        // Crear usuario admin por defecto
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                fullName: 'Administrador FitZone',
                email: 'admin@fitzone.com',
                phone: '(11) 1111-1111',
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });
            console.log('✅ Usuario admin creado: admin@fitzone.com / admin123');
        }

        // Crear clases predefinidas (incluyendo Pilates)
        const existingClasses = await Class.countDocuments();
        if (existingClasses === 0) {
            await Class.insertMany([
                {
                    name: 'F.E.C',
                    schedule: 'Lunes y Miércoles',
                    scheduleDetails: [
                        { day: 'Lunes', time: '10:00 - 11:00', period: 'mañana' },
                        { day: 'Lunes', time: '18:00 - 19:00', period: 'tarde' },
                        { day: 'Miércoles', time: '10:00 - 11:00', period: 'mañana' },
                        { day: 'Miércoles', time: '18:00 - 19:00', period: 'tarde' }
                    ],
                    capacity: 15,
                    instructor: 'Carlos Mendoza',
                    color: '#22c55e' // Verde
                },
                {
                    name: 'Yoga',
                    schedule: 'Martes y Jueves',
                    scheduleDetails: [
                        { day: 'Martes', time: '09:00 - 10:00', period: 'mañana' },
                        { day: 'Martes', time: '19:00 - 20:00', period: 'noche' },
                        { day: 'Jueves', time: '09:00 - 10:00', period: 'mañana' },
                        { day: 'Jueves', time: '19:00 - 20:00', period: 'noche' }
                    ],
                    capacity: 20,
                    instructor: 'Ana García',
                    color: '#ef4444' // Rojo
                },
                {
                    name: 'Spinning',
                    schedule: 'Miércoles y Viernes',
                    scheduleDetails: [
                        { day: 'Miércoles', time: '08:00 - 09:00', period: 'mañana' },
                        { day: 'Miércoles', time: '19:00 - 20:00', period: 'noche' },
                        { day: 'Viernes', time: '08:00 - 09:00', period: 'mañana' },
                        { day: 'Viernes', time: '19:00 - 20:00', period: 'noche' }
                    ],
                    capacity: 12,
                    instructor: 'Roberto Silva',
                    color: '#3b82f6' // Azul
                },
                {
                    name: 'Pilates',
                    schedule: 'Martes y Viernes',
                    scheduleDetails: [
                        { day: 'Martes', time: '11:00 - 12:00', period: 'mañana' },
                        { day: 'Martes', time: '17:00 - 18:00', period: 'tarde' },
                        { day: 'Viernes', time: '11:00 - 12:00', period: 'mañana' },
                        { day: 'Viernes', time: '17:00 - 18:00', period: 'tarde' }
                    ],
                    capacity: 15,
                    instructor: 'María López',
                    color: '#f59e0b' // Amarillo
                }
            ]);
            console.log('✅ Clases predefinidas creadas (F.E.C, Yoga, Spinning, Pilates)');
        }
    } catch (error) {
        console.log('Error inicializando datos:', error);
    }
}

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Acceso no autorizado' });
    }
}

// Middleware de admin
function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
}

// ============== RUTAS HTML ==============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/tienda', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tienda.html'));
});

app.get('/admin', requireAuth, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ============== APIs BÁSICAS ==============

app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: {
            fullName: req.session.user.fullName,
            email: req.session.user.email,
            phone: req.session.user.phone,
            role: req.session.user.role
        }
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: 'Ya existe una cuenta con este email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ fullName, email, phone, password: hashedPassword });
        await newUser.save();

        res.json({ success: true, message: 'Usuario registrado exitosamente' });

    } catch (error) {
        console.error('Error en registro:', error);
        res.json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==================== MODIFICAR LA RUTA DE LOGIN EN server.js ====================
// REEMPLAZAR la ruta app.post('/api/login', ...) existente con esta versión mejorada:

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const user = await User.findOne({ email, status: 'active' });
        if (!user) {
            return res.json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Crear sesión
        req.session.user = {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role
        };

        // Redirigir según el rol
        const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';

        res.json({
            success: true,
            message: 'Login exitoso',
            redirectUrl: redirectUrl,
            userId: user._id, // Importante para verificar membresía
            user: {
                role: user.role,
                fullName: user.fullName
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.json({ success: false, message: 'Error al cerrar sesión' });
        }
        res.json({ success: true, message: 'Sesión cerrada exitosamente' });
    });
});

// ============== APIs DE ADMIN ==============

app.get('/api/admin/dashboard-stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeReservations = await Reservation.countDocuments({ status: 'active' });
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyOrders = await Order.countDocuments({ createdAt: { $gte: startOfMonth } });
        
        const monthlyRevenueResult = await Order.aggregate([
            { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        
        const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

        res.json({
            success: true,
            stats: { totalUsers, activeReservations, monthlyOrders, monthlyRevenue }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.json({ success: false, message: 'Error obteniendo estadísticas' });
    }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }, '-password').sort({ createdAt: -1 });
        res.json({ success: true, users: users });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.json({ success: false, message: 'Error obteniendo usuarios' });
    }
});

app.put('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullName, email, phone, status } = req.body;

        const existingUser = await User.findOne({ email: email, _id: { $ne: userId } });
        if (existingUser) {
            return res.json({ success: false, message: 'El email ya está en uso por otro usuario' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fullName, email, phone, status },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({ success: true, message: 'Usuario actualizado correctamente', user: updatedUser });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.json({ success: false, message: 'Error actualizando usuario' });
    }
});

app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.session.user.id) {
            return res.json({ success: false, message: 'No puedes eliminarte a ti mismo' });
        }

        await Reservation.deleteMany({ userId: userId });
        await Cart.deleteOne({ userId: userId });
        
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({ success: true, message: 'Usuario eliminado correctamente' });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.json({ success: false, message: 'Error eliminando usuario' });
    }
});

app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .lean();

        const formattedOrders = orders.map(order => ({
            ...order,
            userInfo: order.userId || { fullName: 'Usuario eliminado', email: 'N/A' }
        }));

        res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        res.json({ success: false, message: 'Error obteniendo órdenes' });
    }
});

app.get('/api/admin/orders/:orderId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findById(orderId).populate({
            path: 'userId',
            select: 'fullName email'
        });
        
        if (!order) {
            return res.json({ success: false, message: 'Orden no encontrada' });
        }

        res.json({
            success: true,
            order: {
                _id: order._id,
                items: order.items,
                total: order.total,
                status: order.status,
                createdAt: order.createdAt,
                userInfo: order.userId || { fullName: 'Usuario eliminado', email: 'N/A' }
            }
        });
    } catch (error) {
        console.error('Error obteniendo detalles de orden:', error);
        res.json({ success: false, message: 'Error obteniendo detalles de orden' });
    }
});

app.get('/api/admin/statistics', requireAuth, requireAdmin, async (req, res) => {
    try {
        const topClasses = await Reservation.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$className', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const registrationsByMonth = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, role: 'user' } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({ success: true, stats: { topClasses, registrationsByMonth } });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.json({ success: false, message: 'Error obteniendo estadísticas' });
    }
});

// ============== APIs DE CLASES Y RESERVAS ==============

app.get('/api/classes', async (req, res) => {
    try {
        const classes = await Class.find({ active: true });
        res.json({ success: true, classes: classes });
    } catch (error) {
        console.error('Error obteniendo clases:', error);
        res.json({ success: false, message: 'Error obteniendo clases' });
    }
});

app.get('/api/my-reservations', requireAuth, async (req, res) => {
    try {
        // Filtrar solo reservas futuras o de hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const reservations = await Reservation.find({ 
            userId: req.session.user.id,
            status: 'active',
            date: { $gte: today } // Solo reservas de hoy en adelante
        }).populate('classId').sort({ date: 1 });

        res.json({ success: true, reservations: reservations });
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        res.json({ success: false, message: 'Error obteniendo reservas' });
    }
});

app.post('/api/reserve-class', requireAuth, async (req, res) => {
    try {
        const { classId, date, time } = req.body;

        const classExists = await Class.findById(classId);
        if (!classExists) {
            return res.json({ success: false, message: 'La clase no existe' });
        }

        const existingReservation = await Reservation.findOne({
            userId: req.session.user.id,
            classId: classId,
            date: new Date(date),
            status: 'active'
        });

        if (existingReservation) {
            return res.json({ success: false, message: 'Ya tienes una reserva para esta clase en esa fecha' });
        }

        const reservationsCount = await Reservation.countDocuments({
            classId: classId,
            date: new Date(date),
            status: 'active'
        });

        if (reservationsCount >= classExists.capacity) {
            return res.json({ success: false, message: 'La clase está llena para esa fecha' });
        }

        const newReservation = new Reservation({
            userId: req.session.user.id,
            classId: classId,
            className: classExists.name,
            date: new Date(date),
            time: time
        });

        await newReservation.save();

        res.json({ success: true, message: 'Reserva creada exitosamente', reservation: newReservation });

    } catch (error) {
        console.error('Error creando reserva:', error);
        res.json({ success: false, message: 'Error interno del servidor' });
    }
});

app.delete('/api/cancel-reservation/:reservationId', requireAuth, async (req, res) => {
    try {
        const { reservationId } = req.params;

        const reservation = await Reservation.findOneAndUpdate(
            { _id: reservationId, userId: req.session.user.id, status: 'active' },
            { status: 'cancelled' },
            { new: true }
        );

        if (!reservation) {
            return res.json({ success: false, message: 'Reserva no encontrada' });
        }

        res.json({ success: true, message: 'Reserva cancelada exitosamente' });

    } catch (error) {
        console.error('Error cancelando reserva:', error);
        res.json({ success: false, message: 'Error interno del servidor' });
    }
});

// ============== APIs DE CARRITO Y TIENDA ==============

app.get('/api/cart', requireAuth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.session.user.id });
        
        if (!cart) {
            cart = new Cart({ userId: req.session.user.id, items: [] });
            await cart.save();
        }

        res.json({ success: true, cart: cart });
    } catch (error) {
        console.error('Error obteniendo carrito:', error);
        res.json({ success: false, message: 'Error obteniendo carrito' });
    }
});

app.post('/api/cart/add', requireAuth, async (req, res) => {
    try {
        const { productId, name, price } = req.body;

        let cart = await Cart.findOne({ userId: req.session.user.id });
        
        if (!cart) {
            cart = new Cart({ userId: req.session.user.id, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.items.push({ productId: productId, name: name, price: price, quantity: 1 });
        }

        cart.updatedAt = new Date();
        await cart.save();

        res.json({ success: true, message: 'Producto agregado al carrito', cart: cart });

    } catch (error) {
        console.error('Error agregando al carrito:', error);
        res.json({ success: false, message: 'Error agregando al carrito' });
    }
});

app.post('/api/cart/checkout', requireAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.session.user.id });
        
        if (!cart || cart.items.length === 0) {
            return res.json({ success: false, message: 'El carrito está vacío' });
        }

        const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const order = new Order({
            userId: req.session.user.id,
            items: cart.items,
            total: total
        });

        await order.save();

        cart.items = [];
        cart.updatedAt = new Date();
        await cart.save();

        res.json({ success: true, message: 'Compra realizada exitosamente', order: order });

    } catch (error) {
        console.error('Error finalizando compra:', error);
        res.json({ success: false, message: 'Error finalizando compra' });
    }
});

app.get('/api/orders', requireAuth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, orders: orders });
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        res.json({ success: false, message: 'Error obteniendo historial' });
    }
});

// ==================== AGREGAR ESTAS RUTAS DESPUÉS DE LAS APIs DE CARRITO EN server.js ====================

// ============== APIs DE MEMBRESÍAS ==============

// Función auxiliar para generar código único de membresía
function generateMembershipCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FZ-2P-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Función auxiliar para calcular fecha de vencimiento
function calculateEndDate(planType, startDate = new Date()) {
    const endDate = new Date(startDate);
    
    if (planType === 'dia-clase') {
        endDate.setDate(endDate.getDate() + 1); // 1 día
    } else if (planType === 'semanal') {
        endDate.setDate(endDate.getDate() + 7); // 7 días
    } else {
        endDate.setMonth(endDate.getMonth() + 1); // 1 mes
    }
    
    return endDate;
}

// API: Registro con Membresía
app.post('/api/register-with-membership', async (req, res) => {
    try {
        const { membershipPlan, paymentMethod, trainingDays } = req.body;
        
        // Verificar plan válido
        const validPlans = ['mes-libre', 'dos-personas', 'tres-veces', 'semanal', 'dia-clase', 'jubilados'];
        if (!validPlans.includes(membershipPlan)) {
            return res.json({
                success: false,
                message: 'Plan de membresía no válido'
            });
        }
        
        // Precios según plan
        const prices = {
            'mes-libre': 32000,
            'dos-personas': 28000,
            'tres-veces': 24000,
            'semanal': 11500,
            'dia-clase': 5000,
            'jubilados': 20000
        };
        
        let finalPrice = prices[membershipPlan];
        
        // Aplicar recargo de Mercado Pago
        if (paymentMethod === 'mercadopago') {
            finalPrice = finalPrice * 1.05;
        }
        
        // CASO: MEMBRESÍA DE 2 PERSONAS
        if (membershipPlan === 'dos-personas') {
            const { person1, person2 } = req.body;
            
            // Validar datos
            if (!person1 || !person2) {
                return res.json({
                    success: false,
                    message: 'Datos incompletos para membresía de 2 personas'
                });
            }
            
            // Verificar que los emails no existan
            const existingUser1 = await User.findOne({ email: person1.email });
            const existingUser2 = await User.findOne({ email: person2.email });
            
            if (existingUser1 || existingUser2) {
                return res.json({
                    success: false,
                    message: 'Uno de los emails ya está registrado'
                });
            }
            
            // Crear primer usuario
            const hashedPassword = await bcrypt.hash(person1.password, 10);
            const newUser = new User({
                fullName: person1.fullName,
                email: person1.email,
                phone: person1.phone,
                password: hashedPassword
            });
            await newUser.save();
            
            // Generar código único
            const membershipCode = generateMembershipCode();
            
            // Crear membresía
            const membership = new Membership({
                userId: newUser._id,
                planType: membershipPlan,
                price: finalPrice,
                endDate: calculateEndDate(membershipPlan),
                status: 'active',
                paymentMethod: paymentMethod,
                sharedMembership: {
                    isShared: true,
                    membershipCode: membershipCode,
                    mainUserId: newUser._id,
                    secondUserActivated: false
                }
            });
            await membership.save();
            
            // Guardar datos de la segunda persona como pendiente
            const pendingUser = new PendingUser({
                fullName: person2.fullName,
                age: person2.age,
                email: person2.email,
                phone: person2.phone,
                address: person2.address,
                membershipCode: membershipCode,
                mainUserId: newUser._id
            });
            await pendingUser.save();
            
            return res.json({
                success: true,
                message: 'Membresía de 2 personas creada exitosamente',
                membershipCode: membershipCode
            });
        }
        
        // CASO: MEMBRESÍA DE JUBILADOS
        if (membershipPlan === 'jubilados') {
            const { fullName, dni, age, gender, email, phone, address, password } = req.body;
            
            // Validar edad según género
            if (gender === 'femenino' && age < 60) {
                return res.json({
                    success: false,
                    message: 'Las mujeres deben tener 60 años o más'
                });
            }
            
            if (gender === 'masculino' && age < 65) {
                return res.json({
                    success: false,
                    message: 'Los hombres deben tener 65 años o más'
                });
            }
            
            // Verificar email existente
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.json({
                    success: false,
                    message: 'El email ya está registrado'
                });
            }
            
            // Crear usuario
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
                fullName,
                email,
                phone,
                password: hashedPassword
            });
            await newUser.save();
            
            // Crear membresía
            const membership = new Membership({
                userId: newUser._id,
                planType: membershipPlan,
                price: finalPrice,
                endDate: calculateEndDate(membershipPlan),
                status: 'active',
                paymentMethod: paymentMethod,
                verificationData: {
                    dni: dni,
                    age: age,
                    gender: gender
                }
            });
            await membership.save();
            
            return res.json({
                success: true,
                message: 'Registro de jubilado completado exitosamente'
            });
        }
        
        // CASO: MEMBRESÍA 3 VECES POR SEMANA
        if (membershipPlan === 'tres-veces') {
            const { fullName, email, phone, address, password } = req.body;
            
            // Validar días seleccionados
            if (!trainingDays || trainingDays.length !== 3) {
                return res.json({
                    success: false,
                    message: 'Debes seleccionar exactamente 3 días de entrenamiento'
                });
            }
            
            // Verificar email existente
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.json({
                    success: false,
                    message: 'El email ya está registrado'
                });
            }
            
            // Crear usuario
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
                fullName,
                email,
                phone,
                password: hashedPassword
            });
            await newUser.save();
            
            // Crear membresía
            const membership = new Membership({
                userId: newUser._id,
                planType: membershipPlan,
                price: finalPrice,
                endDate: calculateEndDate(membershipPlan),
                status: 'active',
                paymentMethod: paymentMethod,
                trainingDays: trainingDays
            });
            await membership.save();
            
            return res.json({
                success: true,
                message: 'Registro completado exitosamente'
            });
        }
        
        // CASO: MEMBRESÍA ESTÁNDAR (MES LIBRE O DÍA/CLASE)
        const { fullName, email, phone, address, password } = req.body;
        
        // Verificar email existente
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({
                success: false,
                message: 'El email ya está registrado'
            });
        }
        
        // Crear usuario
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullName,
            email,
            phone,
            password: hashedPassword
        });
        await newUser.save();
        
        // Crear membresía
        const membership = new Membership({
            userId: newUser._id,
            planType: membershipPlan,
            price: finalPrice,
            endDate: calculateEndDate(membershipPlan),
            status: 'active',
            paymentMethod: paymentMethod
        });
        await membership.save();
        
        return res.json({
            success: true,
            message: 'Registro completado exitosamente'
        });
        
    } catch (error) {
        console.error('Error en registro con membresía:', error);
        res.json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// API: Verificar código de membresía compartida
app.post('/api/verify-membership-code', async (req, res) => {
    try {
        const { code } = req.body;
        
        // Buscar membresía con ese código
        const membership = await Membership.findOne({
            'sharedMembership.membershipCode': code,
            'sharedMembership.isShared': true,
            'sharedMembership.secondUserActivated': false,
            status: 'active'
        }).populate('userId', 'fullName');
        
        if (!membership) {
            return res.json({
                success: false,
                message: 'Código inválido, expirado o ya utilizado'
            });
        }
        
        // Buscar datos pendientes
        const pendingUser = await PendingUser.findOne({ membershipCode: code });
        
        if (!pendingUser) {
            return res.json({
                success: false,
                message: 'No se encontraron datos asociados al código'
            });
        }
        
        return res.json({
            success: true,
            membershipInfo: {
                ownerName: membership.userId.fullName,
                plan: 'Membresía para 2 Personas',
                pendingData: {
                    fullName: pendingUser.fullName,
                    email: pendingUser.email,
                    phone: pendingUser.phone
                }
            }
        });
        
    } catch (error) {
        console.error('Error verificando código:', error);
        res.json({
            success: false,
            message: 'Error al verificar el código'
        });
    }
});

// API: Activar cuenta con código
app.post('/api/activate-with-code', async (req, res) => {
    try {
        const { code, password } = req.body;
        
        // Buscar datos pendientes
        const pendingUser = await PendingUser.findOne({ membershipCode: code });
        
        if (!pendingUser) {
            return res.json({
                success: false,
                message: 'Código no válido'
            });
        }
        
        // Verificar que el email no exista
        const existingUser = await User.findOne({ email: pendingUser.email });
        if (existingUser) {
            return res.json({
                success: false,
                message: 'El email ya está registrado'
            });
        }
        
        // Crear usuario
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullName: pendingUser.fullName,
            email: pendingUser.email,
            phone: pendingUser.phone,
            password: hashedPassword
        });
        await newUser.save();
        
        // Actualizar membresía
        await Membership.findOneAndUpdate(
            { 'sharedMembership.membershipCode': code },
            {
                'sharedMembership.secondUserId': newUser._id,
                'sharedMembership.secondUserActivated': true
            }
        );
        
        // Crear membresía para el segundo usuario (referencia a la misma)
        const originalMembership = await Membership.findOne({
            'sharedMembership.membershipCode': code
        });
        
        const secondMembership = new Membership({
            userId: newUser._id,
            planType: 'dos-personas',
            price: originalMembership.price,
            startDate: originalMembership.startDate,
            endDate: originalMembership.endDate,
            status: 'active',
            paymentMethod: originalMembership.paymentMethod,
            sharedMembership: {
                isShared: true,
                membershipCode: code,
                mainUserId: originalMembership.userId,
                secondUserId: newUser._id,
                secondUserActivated: true
            }
        });
        await secondMembership.save();
        
        // Eliminar datos pendientes
        await PendingUser.deleteOne({ _id: pendingUser._id });
        
        return res.json({
            success: true,
            message: 'Cuenta activada exitosamente'
        });
        
    } catch (error) {
        console.error('Error activando cuenta:', error);
        res.json({
            success: false,
            message: 'Error al activar la cuenta'
        });
    }
});

// API: Obtener membresía del usuario
app.get('/api/user/membership', requireAuth, async (req, res) => {
    try {
        const membership = await Membership.findOne({
            userId: req.session.user.id,
            status: 'active'
        }).sort({ createdAt: -1 });
        
        if (!membership) {
            return res.json({
                success: false,
                message: 'No tienes membresía activa'
            });
        }
        
        // Calcular días restantes
        const today = new Date();
        const endDate = new Date(membership.endDate);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Verificar si está por vencer (7 días antes)
        const isExpiringSoon = diffDays <= 7 && diffDays > 0;
        const isExpired = diffDays <= 0;
        
        return res.json({
            success: true,
            membership: {
                planType: membership.planType,
                price: membership.price,
                startDate: membership.startDate,
                endDate: membership.endDate,
                status: membership.status,
                daysRemaining: Math.max(0, diffDays),
                isExpiringSoon: isExpiringSoon,
                isExpired: isExpired,
                trainingDays: membership.trainingDays || [],
                sharedMembership: membership.sharedMembership
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo membresía:', error);
        res.json({
            success: false,
            message: 'Error al obtener membresía'
        });
    }
});

// ==================== REEMPLAZAR O AGREGAR EN server.js ====================
// Busca app.get('/api/user/stats', ...) y reemplázala con esta versión:

app.get('/api/user/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Obtener usuario
        const user = await User.findById(userId);
        
        // Reservas activas (futuras o de hoy)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const activeReservations = await Reservation.countDocuments({
            userId: userId,
            status: 'active',
            date: { $gte: today }
        });
        
        // Entrenamientos completados (reservas pasadas)
        const completedTrainings = await Reservation.countDocuments({
            userId: userId,
            status: 'active',
            date: { $lt: today }
        });
        
        // Total de órdenes
        const totalOrders = await Order.countDocuments({ userId: userId });
        
        // Total gastado
        const ordersData = await Order.find({ userId: userId, status: 'completed' });
        const totalSpent = ordersData.reduce((sum, order) => sum + order.total, 0);
        
        // Todas las reservas para el contador
        const totalReservations = await Reservation.countDocuments({
            userId: userId
        });
        
        res.json({
            success: true,
            stats: {
                activeReservations: activeReservations,
                completedTrainings: completedTrainings,
                totalReservations: totalReservations,
                totalOrders: totalOrders,
                totalSpent: totalSpent,
                memberSince: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.json({
            success: false,
            message: 'Error obteniendo estadísticas',
            stats: {
                activeReservations: 0,
                completedTrainings: 0,
                totalReservations: 0,
                totalOrders: 0,
                totalSpent: 0,
                memberSince: new Date()
            }
        });
    }
});

// API: Verificar estado de membresía en login
app.post('/api/check-membership-status', async (req, res) => {
    try {
        const { userId } = req.body;
        
        const membership = await Membership.findOne({
            userId: userId,
            status: 'active'
        });
        
        if (!membership) {
            return res.json({
                success: false,
                membershipStatus: 'none',
                message: 'No tienes membresía activa'
            });
        }
        
        const today = new Date();
        const endDate = new Date(membership.endDate);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Si la membresía expiró
        if (diffDays <= 0) {
            await Membership.findByIdAndUpdate(membership._id, { status: 'expired' });
            
            return res.json({
                success: false,
                membershipStatus: 'expired',
                message: 'Tu membresía ha expirado. Por favor renuévala para continuar.',
                daysExpired: Math.abs(diffDays)
            });
        }
        
        // Si está por vencer (7 días o menos)
        if (diffDays <= 7) {
            // Crear notificación si no existe
            const existingNotification = await Notification.findOne({
                userId: userId,
                type: 'membership_expiring',
                read: false
            });
            
            if (!existingNotification && !membership.renewalNotificationSent) {
                await Notification.create({
                    userId: userId,
                    type: 'membership_expiring',
                    title: 'Membresía por vencer',
                    message: `Tu membresía vence en ${diffDays} días. Renuévala para seguir disfrutando de nuestros servicios.`
                });
                
                await Membership.findByIdAndUpdate(membership._id, { renewalNotificationSent: true });
            }
            
            return res.json({
                success: true,
                membershipStatus: 'expiring_soon',
                warning: true,
                message: `Tu membresía vence en ${diffDays} días`,
                daysRemaining: diffDays
            });
        }
        
        return res.json({
            success: true,
            membershipStatus: 'active',
            daysRemaining: diffDays
        });
        
    } catch (error) {
        console.error('Error verificando membresía:', error);
        res.json({
            success: false,
            message: 'Error al verificar membresía'
        });
    }
});

// API: Obtener notificaciones del usuario
app.get('/api/user/notifications', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({
            userId: req.session.user.id
        }).sort({ createdAt: -1 }).limit(10);
        
        res.json({
            success: true,
            notifications: notifications,
            unreadCount: notifications.filter(n => !n.read).length
        });
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        res.json({
            success: false,
            message: 'Error al obtener notificaciones'
        });
    }
});

// API: Marcar notificación como leída
app.put('/api/user/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false });
    }
});

// ==================== FIN DE LAS APIS DE MEMBRESÍAS ====================

// ==================== AGREGAR ESTAS RUTAS AL server.js ====================

// Agregar después de las rutas HTML existentes

// Ruta para la página de checkout
app.get('/checkout', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

// ============== NUEVAS RUTAS PARA CHECKOUT ==============

// Schema para órdenes con información completa de envío
const enhancedOrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema],
    customer: {
        name: String,
        email: String,
        phone: String,
        dni: String
    },
    shipping: {
        method: { type: String, enum: ['domicilio', 'sucursal', 'fitzone'], required: true },
        cost: { type: Number, default: 0 },
        address: {
            street: String,
            floor: String,
            city: String,
            province: String,
            zipcode: String,
            notes: String
        }
    },
    payment: {
        method: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta', 'mercadopago'], required: true }
    },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

// Actualizar el modelo Order si ya existe o crear uno nuevo
// const EnhancedOrder = mongoose.model('EnhancedOrder', enhancedOrderSchema);
// O actualizar el existente agregando los campos nuevos

// API: Completar checkout
app.post('/api/checkout/complete', requireAuth, async (req, res) => {
    try {
        const { customer, shipping, payment, items } = req.body;
        
        // Validar que hay items
        if (!items || items.length === 0) {
            return res.json({
                success: false,
                message: 'No hay productos en el carrito'
            });
        }
        
        // Calcular subtotal
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Aplicar recargo de Mercado Pago si corresponde
        let finalSubtotal = subtotal;
        if (payment.method === 'mercadopago') {
            finalSubtotal = subtotal * 1.05;
        }
        
        // Calcular total con envío
        const total = finalSubtotal + shipping.cost;
        
        // Crear la orden
        const newOrder = new Order({
            userId: req.session.user.id,
            items: items,
            total: Math.round(total),
            status: 'completed', // O 'pending' si requiere confirmación
            // Si usas el schema mejorado:
            // customer: customer,
            // shipping: shipping,
            // payment: payment,
            // subtotal: Math.round(finalSubtotal)
        });
        
        await newOrder.save();
        
        // Limpiar el carrito del usuario
        await Cart.findOneAndUpdate(
            { userId: req.session.user.id },
            { items: [], updatedAt: new Date() }
        );
        
        // Aquí podrías enviar un email de confirmación
        // await sendOrderConfirmationEmail(customer.email, newOrder);
        
        res.json({
            success: true,
            message: 'Compra realizada exitosamente',
            orderId: newOrder._id.toString().slice(-8).toUpperCase(),
            order: newOrder
        });
        
    } catch (error) {
        console.error('Error en checkout:', error);
        res.json({
            success: false,
            message: 'Error al procesar la compra'
        });
    }
});

// API: Obtener historial de órdenes con detalles completos
app.get('/api/orders/history', requireAuth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.session.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({
            success: true,
            orders: orders
        });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.json({
            success: false,
            message: 'Error al obtener historial de compras'
        });
    }
});

// ============== MEJORAS AL SISTEMA DE CLASES ==============

// Actualizar el schema de Class para incluir scheduleDetails si no existe
const Class = mongoose.model('Class', classSchema);

// API mejorada: Obtener clases con horarios detallados
app.get('/api/classes/detailed', async (req, res) => {
    try {
        const classes = await Class.find({ active: true });
        res.json({ 
            success: true, 
            classes: classes 
        });
    } catch (error) {
        console.error('Error obteniendo clases:', error);
        res.json({ 
            success: false, 
            message: 'Error obteniendo clases' 
        });
    }
});

// API: Verificar disponibilidad de clase en fecha/hora específica
app.post('/api/classes/check-availability', async (req, res) => {
    try {
        const { classId, date, time } = req.body;
        
        const classExists = await Class.findById(classId);
        if (!classExists) {
            return res.json({
                success: false,
                message: 'Clase no encontrada'
            });
        }
        
        // Contar reservas para esa fecha y hora específica
        const reservationsCount = await Reservation.countDocuments({
            classId: classId,
            date: new Date(date),
            time: time,
            status: 'active'
        });
        
        const available = reservationsCount < classExists.capacity;
        const spotsLeft = classExists.capacity - reservationsCount;
        
        res.json({
            success: true,
            available: available,
            spotsLeft: spotsLeft,
            capacity: classExists.capacity
        });
        
    } catch (error) {
        console.error('Error verificando disponibilidad:', error);
        res.json({
            success: false,
            message: 'Error verificando disponibilidad'
        });
    }
});

// ============== MEJORAS AL DASHBOARD ==============

// API mejorada: Stats del usuario con lógica para nuevos usuarios
app.get('/api/user/stats/improved', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Reservas activas (futuras)
        const activeReservations = await Reservation.countDocuments({
            userId: userId,
            status: 'active',
            date: { $gte: today }
        });
        
        // Entrenamientos completados (reservas pasadas)
        const completedTrainings = await Reservation.countDocuments({
            userId: userId,
            status: 'active',
            date: { $lt: today }
        });
        
        // Total de órdenes
        const totalOrders = await Order.countDocuments({ userId: userId });
        
        // Total gastado
        const ordersData = await Order.find({ userId: userId, status: 'completed' });
        const totalSpent = ordersData.reduce((sum, order) => sum + order.total, 0);
        
        // Calcular días como miembro
        const memberSince = user.createdAt;
        const diffTime = Math.abs(today - memberSince);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Verificar si es usuario nuevo (menos de 7 días)
        const isNewUser = diffDays < 7;
        
        res.json({
            success: true,
            stats: {
                activeReservations: activeReservations,
                completedTrainings: completedTrainings,
                totalReservations: activeReservations + completedTrainings,
                totalOrders: totalOrders,
                totalSpent: totalSpent,
                memberSince: user.createdAt,
                memberDays: diffDays,
                isNewUser: isNewUser
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.json({
            success: false,
            message: 'Error obteniendo estadísticas',
            stats: {
                activeReservations: 0,
                completedTrainings: 0,
                totalReservations: 0,
                totalOrders: 0,
                totalSpent: 0,
                memberSince: new Date(),
                memberDays: 0,
                isNewUser: true
            }
        });
    }
});

// ============== SISTEMA MEJORADO DE RESERVAS ==============

// API mejorada: Obtener fechas disponibles para una clase
app.post('/api/classes/available-dates', async (req, res) => {
    try {
        const { classId } = req.body;
        
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.json({
                success: false,
                message: 'Clase no encontrada'
            });
        }
        
        // Generar próximas fechas basadas en scheduleDetails
        const availableDates = [];
        const today = new Date();
        const daysMap = {
            'Domingo': 0,
            'Lunes': 1,
            'Martes': 2,
            'Miércoles': 3,
            'Jueves': 4,
            'Viernes': 5,
            'Sábado': 6
        };
        
        // Obtener días de la semana para esta clase
        const classDays = classData.scheduleDetails.map(schedule => daysMap[schedule.day]);
        
        // Generar próximos 30 días disponibles
        for (let i = 0; i < 60; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            if (classDays.includes(date.getDay())) {
                // Para cada día disponible, incluir los horarios
                const dayName = Object.keys(daysMap).find(key => daysMap[key] === date.getDay());
                const timesForDay = classData.scheduleDetails.filter(s => s.day === dayName);
                
                timesForDay.forEach(timeSlot => {
                    availableDates.push({
                        date: date.toISOString().split('T')[0],
                        displayDate: date.toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }),
                        time: timeSlot.time,
                        period: timeSlot.period
                    });
                });
            }
        }
        
        res.json({
            success: true,
            dates: availableDates.slice(0, 30) // Limitar a 30 slots
        });
        
    } catch (error) {
        console.error('Error obteniendo fechas:', error);
        res.json({
            success: false,
            message: 'Error obteniendo fechas disponibles'
        });
    }
});

// API mejorada: Reservar clase con validación de horario
app.post('/api/reserve-class/improved', requireAuth, async (req, res) => {
    try {
        const { classId, date, time } = req.body;

        // Validar que la clase existe
        const classExists = await Class.findById(classId);
        if (!classExists) {
            return res.json({ 
                success: false, 
                message: 'La clase no existe' 
            });
        }

        // Verificar que el usuario no tenga ya una reserva para esa clase/fecha/hora
        const existingReservation = await Reservation.findOne({
            userId: req.session.user.id,
            classId: classId,
            date: new Date(date),
            time: time,
            status: 'active'
        });

        if (existingReservation) {
            return res.json({ 
                success: false, 
                message: 'Ya tienes una reserva para esta clase en este horario' 
            });
        }

        // Verificar capacidad disponible
        const reservationsCount = await Reservation.countDocuments({
            classId: classId,
            date: new Date(date),
            time: time,
            status: 'active'
        });

        if (reservationsCount >= classExists.capacity) {
            return res.json({ 
                success: false, 
                message: 'La clase está llena para este horario. Por favor elige otro horario.' 
            });
        }

        // Verificar membresía del usuario
        const membership = await Membership.findOne({
            userId: req.session.user.id,
            status: 'active'
        });

        if (!membership) {
            return res.json({
                success: false,
                message: 'No tienes una membresía activa. Adquiere una para reservar clases.'
            });
        }

        // Verificar si la fecha está dentro del período de la membresía
        const reservationDate = new Date(date);
        const membershipEnd = new Date(membership.endDate);
        
        if (reservationDate > membershipEnd) {
            return res.json({
                success: false,
                message: 'La fecha seleccionada está fuera de tu período de membresía.'
            });
        }

        // Si es membresía de 3 veces, verificar que sea un día permitido
        if (membership.planType === 'tres-veces') {
            const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const dayOfWeek = dayNames[reservationDate.getDay()];
            
            if (!membership.trainingDays.includes(dayOfWeek)) {
                return res.json({
                    success: false,
                    message: 'Este día no está permitido según tu membresía. Revisa tus días de entrenamiento.'
                });
            }
        }

        // Crear la reserva
        const newReservation = new Reservation({
            userId: req.session.user.id,
            classId: classId,
            className: classExists.name,
            date: new Date(date),
            time: time
        });

        await newReservation.save();

        // Crear notificación
        await Notification.create({
            userId: req.session.user.id,
            type: 'general',
            title: 'Reserva Confirmada',
            message: `Tu reserva para ${classExists.name} el ${new Date(date).toLocaleDateString('es-ES')} a las ${time} ha sido confirmada.`
        });

        res.json({ 
            success: true, 
            message: 'Reserva creada exitosamente', 
            reservation: newReservation 
        });

    } catch (error) {
        console.error('Error creando reserva:', error);
        res.json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ============== INSTRUCCIONES DE IMPLEMENTACIÓN ==============

/*
PASOS PARA IMPLEMENTAR ESTAS MEJORAS:

1. CREAR ARCHIVOS NUEVOS:
   - views/checkout.html (usar el código del artifact checkout_page)
   - public/js/alerts.js (usar el código del artifact fitzone_alerts_js)

2. AGREGAR ESTILOS:
   - Agregar al final de public/css/style.css los estilos del artifact fitzone_alerts_css

3. ACTUALIZAR ARCHIVOS EXISTENTES:
   
   A) En views/register.html:
      - Reemplazar todo el <script> del final con el código del artifact register_fixed
      - Agregar antes de </head>:
        <script src="/js/alerts.js"></script>
   
   B) En views/login.html:
      - Agregar antes de </head>:
        <script src="/js/alerts.js"></script>
      - Reemplazar los alert() con showCustomAlert()
   
   C) En views/dashboard.html:
      - Agregar antes de </head>:
        <script src="/js/alerts.js"></script>
      - Actualizar la función loadDashboardStats() para usar /api/user/stats/improved
      - Reemplazar alert() con showCustomAlert()
   
   D) En views/tienda.html:
      - Cambiar el botón "Finalizar Compra" para redirigir a /checkout:
        
        function finalizePurchase() {
            if (cart.length === 0) {
                showCustomAlert('warning', 'Carrito Vacío', 'Tu carrito está vacío');
                return;
            }
            window.location.href = '/checkout';
        }
   
   E) En views/admin.html:
      - Agregar antes de </head>:
        <script src="/js/alerts.js"></script>
      - Reemplazar alert() y confirm() con showCustomAlert() y showConfirmAlert()

4. ACTUALIZAR server.js:
   - Agregar todas las rutas de este archivo
   - El schema enhancedOrderSchema es opcional, puedes usar el Order existente

5. CREAR DIRECTORIO:
   - Asegúrate de que existe: public/js/

6. REINICIAR SERVIDOR:
   - Detener el servidor (Ctrl+C)
   - Ejecutar: node server.js

EJEMPLO DE CÓMO REEMPLAZAR ALERTAS:

// Antes:
alert('¡Registro exitoso!');

// Después:
showCustomAlert('success', '¡Registro Exitoso!', 'Tu cuenta ha sido creada correctamente.');

// Para confirmaciones:
// Antes:
if (confirm('¿Estás seguro?')) {
    // hacer algo
}

// Después:
showConfirmAlert(
    'Confirmar Acción',
    '¿Estás seguro de continuar?',
    () => {
        // hacer algo si confirma
    },
    () => {
        // hacer algo si cancela (opcional)
    }
);
*/

// ==================== AGREGAR AL FINAL DE server.js (antes de app.listen) ====================

// Función para verificar membresías que están por vencer
async function checkExpiringMemberships() {
    try {
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        
        // Buscar membresías activas que vencen en los próximos 7 días
        const expiringMemberships = await Membership.find({
            status: 'active',
            endDate: {
                $gte: today,
                $lte: sevenDaysFromNow
            },
            renewalNotificationSent: false
        }).populate('userId', 'fullName email');
        
        console.log(`✅ Verificación de membresías: ${expiringMemberships.length} membresías por vencer`);
        
        for (const membership of expiringMemberships) {
            const daysUntilExpiry = Math.ceil((new Date(membership.endDate) - today) / (1000 * 60 * 60 * 24));
            
            // Crear notificación
            await Notification.create({
                userId: membership.userId._id,
                type: 'membership_expiring',
                title: 'Tu membresía está por vencer',
                message: `Tu membresía vence en ${daysUntilExpiry} días. Renuévala para seguir disfrutando de nuestros servicios.`
            });
            
            // Marcar que se envió la notificación
            membership.renewalNotificationSent = true;
            await membership.save();
            
            console.log(`📧 Notificación enviada a: ${membership.userId.fullName}`);
        }
    } catch (error) {
        console.error('Error verificando membresías:', error);
    }
}

// Función para marcar membresías expiradas
async function updateExpiredMemberships() {
    try {
        const today = new Date();
        
        // Buscar membresías activas que ya vencieron
        const result = await Membership.updateMany(
            {
                status: 'active',
                endDate: { $lt: today }
            },
            {
                status: 'expired'
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ ${result.modifiedCount} membresías marcadas como expiradas`);
            
            // Crear notificaciones para usuarios con membresías expiradas
            const expiredMemberships = await Membership.find({
                status: 'expired',
                endDate: { $lt: today }
            }).populate('userId');
            
            for (const membership of expiredMemberships) {
                // Verificar si ya existe una notificación
                const existingNotification = await Notification.findOne({
                    userId: membership.userId._id,
                    type: 'membership_expired'
                });
                
                if (!existingNotification) {
                    await Notification.create({
                        userId: membership.userId._id,
                        type: 'membership_expired',
                        title: 'Membresía Expirada',
                        message: 'Tu membresía ha expirado. Por favor renuévala para continuar accediendo a nuestros servicios.'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error actualizando membresías expiradas:', error);
    }
}

// Ejecutar verificaciones cada hora
setInterval(async () => {
    console.log('\n🔍 Ejecutando verificación automática de membresías...');
    await checkExpiringMemberships();
    await updateExpiredMemberships();
    await cleanOldReservations();
}, 60 * 60 * 1000); // Cada hora

// Ejecutar al iniciar el servidor
setTimeout(async () => {
    console.log('\n🔍 Verificación inicial de membresías...');
    await checkExpiringMemberships();
    await updateExpiredMemberships();
    await cleanOldReservations();
}, 5000); // 5 segundos después de iniciar

// ==================== CONTINUAR CON app.listen(...) ====================
// Función para limpiar reservas pasadas
async function cleanOldReservations() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        
        const result = await Reservation.deleteMany({
            date: { $lt: yesterday },
            status: 'active'
        });
        
        if (result.deletedCount > 0) {
            console.log(`🗑️  ${result.deletedCount} reservas antiguas eliminadas`);
        }
    } catch (error) {
        console.error('Error limpiando reservas antiguas:', error);
    }
}

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abrilcarchedi_db_user:<db_password>@gym-proyecto.vhxnxsq.mongodb.net/?appName=Gym-proyecto';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('âœ… Conectado a MongoDB Local');
    initializeData();
})
.catch(err => console.log('âŒ Error conectando a MongoDB:', err));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log('✨ ¡Proyecto FitZone con MongoDB iniciado correctamente!');
    console.log('👤 Admin por defecto: admin@fitzone.com / admin123');
});

// Manejar cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada');
    process.exit(0);
});