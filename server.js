import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Necesario para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============== MIDDLEWARE ==============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
}));
// Schema del Usuario
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    role: { type: String, enum: ['user', 'admin', 'employee'], default: 'user' }, // ← MODIFICADO
    createdAt: { type: Date, default: Date.now }
});
userSchema.index({ email: 1 });
const User = mongoose.model('User', userSchema);
// ==================== Agrega limites de usuarios en pagina simultanea ====================
// Evitar cargar todos los datos
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find({ role: 'user' }, '-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    
    const total = await User.countDocuments({ role: 'user' });
    
    res.json({ 
        success: true, 
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

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
reservationSchema.index({ userId: 1, date: 1 });
reservationSchema.index({ classId: 1, date: 1, status: 1 });
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
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'cancelled', 'delivered'],
        default: 'completed' 
    },
    deliveredAt: { type: Date },
    deliveredBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ==================== AGREGAR ESTOS SCHEMAS DESPUÉS DEL SCHEMA DE ORDER EN server.js ====================

// Busca el membershipSchema existente y REEMPLÁZALO con este:

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
        gender: String,
        verified: { type: Boolean, default: false }
    },
    // Para membresía de 2 personas
    sharedMembership: {
        isShared: { type: Boolean, default: false },
        membershipCode: String,
        mainUserId: mongoose.Schema.Types.ObjectId,
        secondUserId: mongoose.Schema.Types.ObjectId,
        secondUserActivated: { type: Boolean, default: false },
        // ⭐ NUEVO: Nombres para referencia
        mainUserName: String,
        secondUserName: String
    },
    // ⭐ NUEVO: Última asistencia
    lastAttendance: {
        type: Date,
        default: null
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

membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ endDate: 1, status: 1 });
membershipSchema.index({ lastAttendance: 1 }); // ⭐ NUEVO índice

const Membership = mongoose.model('Membership', membershipSchema);

// ==================== AGREGAR EN server.js DESPUÉS DE membershipSchema ====================

const attendanceSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    membershipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership'
    },
    date: { 
        type: Date, 
        required: true,
        default: Date.now
    },
    checkInTime: {
        type: Date,
        default: Date.now
    },
    registeredBy: {
        type: String, // Nombre del empleado que registró
        required: true
    },
    registeredByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
});

attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

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

        const employeeExists = await User.findOne({ email: 'empleado@fitzone.com' });
        
        if (!employeeExists) {
            const hashedPassword = await bcrypt.hash('empleado123', 10);
            await User.create({
                fullName: 'Empleado FitZone',
                email: 'empleado@fitzone.com',
                phone: '(11) 8765-4321',
                password: hashedPassword,
                role: 'employee',
                status: 'active'
            });
            console.log('✅ Usuario empleado creado: empleado@fitzone.com / empleado123');
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

function requireAuth(req, res, next) {
    // Para rutas API, devolver JSON
    if (req.path.startsWith('/api/')) {
        if (req.session && req.session.user) {
            return next();
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Acceso no autorizado' 
            });
        }
    }
    
    // Para rutas HTML, redirigir
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware para verificar membresía activa
async function requireActiveMembership(req, res, next) {
    try {
        const userId = req.session?.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autorizado',
                requiresLogin: true
            });
        }
        
        // Buscar membresía activa
        const membership = await Membership.findOne({
            userId: userId,
            status: 'active'
        }).sort({ createdAt: -1 });
        
        if (!membership) {
            return res.status(403).json({
                success: false,
                message: 'No tienes una membresía activa',
                membershipExpired: true,
                requiresRenewal: true
            });
        }
        
        // Verificar fecha de vencimiento
        const today = new Date();
        const endDate = new Date(membership.endDate);
        
        if (endDate < today) {
            // Marcar como expirada
            membership.status = 'expired';
            await membership.save();
            
            return res.status(403).json({
                success: false,
                message: 'Tu membresía ha expirado',
                membershipExpired: true,
                requiresRenewal: true,
                expiredDate: endDate
            });
        }
        
        // Membresía válida
        req.membership = membership;
        next();
        
    } catch (error) {
        console.error('Error verificando membresía:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar membresía'
        });
    }
}

function requireAdmin(req, res, next) {
    // Para rutas API, devolver JSON
    if (req.path.startsWith('/api/')) {
        if (req.session && req.session.user && req.session.user.role === 'admin') {
            return next();
        } else {
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso denegado' 
            });
        }
    }
    
    // Para rutas HTML, redirigir
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        // Si es usuario normal, redirigir a dashboard
        if (req.session && req.session.user) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    }
}

// Middleware para verificar si es empleado
function verificarEmpleado(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login-empleado');
    }
    
    // SOLO empleados
    if (req.session.role !== 'employee') {
        if (req.session.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/login-empleado');
    }
    
    next();
}

async function crearUsuariosIniciales() {
    try {
        // Crear admin si no existe
        const adminExists = await User.findOne({ email: 'admin@fitzone.com' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                fullName: 'Administrador FitZone',
                email: 'admin@fitzone.com',
                phone: '(11) 1234-5678',
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });
            console.log('✅ Usuario admin creado: admin@fitzone.com / admin123');
        }
        
        // ⭐ CREAR EMPLEADO DE PRUEBA
        const employeeExists = await User.findOne({ email: 'empleado@fitzone.com' });
        
        if (!employeeExists) {
            const hashedPassword = await bcrypt.hash('empleado123', 10);
            await User.create({
                fullName: 'Empleado FitZone',
                email: 'empleado@fitzone.com',
                phone: '(11) 8765-4321',
                password: hashedPassword,
                role: 'employee',
                status: 'active'
            });
            console.log('✅ Usuario empleado creado: empleado@fitzone.com / empleado123');
        }
        
    } catch (error) {
        console.error('❌ Error creando usuarios iniciales:', error);
    }
}


// ============== RUTAS HTML CORREGIDAS ==============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    // Si ya está logueado, redirigir según rol
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    // Si ya está logueado, redirigir
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Ruta de login para empleados
app.get('/login-empleado', (req, res) => {
    // Si ya está logueado como empleado, redirigir
    if (req.session && req.session.userId && 
        (req.session.role === 'employee' || req.session.role === 'admin')) {
        return res.redirect('/empleados');
    }
    res.sendFile(path.join(__dirname, 'views', 'login-empleado.html'));
});

// Ruta del panel de empleados (protegida)
app.get('/empleados', verificarEmpleado, (req, res) => {
    console.log('📊 Accediendo al dashboard de empleados');
    res.sendFile(path.join(__dirname, 'views', 'empleados.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/tienda', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'tienda.html'));
});

app.get('/admin', requireAuth, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/checkout', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
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

// Agregar validación robusta
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validatePhone = (phone) => {
    const re = /^\(\d{2}\)\s?\d{4}-\d{4}$/;
    return re.test(phone);
};

app.post('/api/register', async (req, res) => {
    const { email, phone } = req.body;
    
    if (!validateEmail(email)) {
        return res.json({ success: false, message: 'Email inválido' });
    }
    
    if (!validatePhone(phone)) {
        return res.json({ success: false, message: 'Formato de teléfono inválido' });
    }

});

// ==================== MODIFICAR LA RUTA DE LOGIN EN server.js ====================
// REEMPLAZAR la ruta app.post('/api/login', ...) existente con esta versión mejorada:

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login cliente:', email);
        
        const user = await User.findOne({ email, status: 'active' });
        if (!user) {
            return res.json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }
        
        // ⭐ RESTRICCIÓN: Empleados no pueden usar este login
        if (user.role === 'employee') {
            return res.json({
                success: false,
                message: 'Los empleados deben usar /login-empleado'
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }
        
        req.session.user = {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role
        };
        
        const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';
        
        console.log('✅ Login exitoso:', redirectUrl);
        
        res.json({
            success: true,
            message: 'Login exitoso',
            redirectUrl: redirectUrl,
            userId: user._id,
            user: {
                role: user.role,
                fullName: user.fullName
            }
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Login para empleados
app.post('/api/login-empleado', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login empleado:', email);
        
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            status: 'active'
        });
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'Credenciales incorrectas' 
            });
        }
        
        // ⭐ RESTRICCIÓN: SOLO empleados
        if (user.role !== 'employee') {
            if (user.role === 'admin') {
                return res.json({ 
                    success: false, 
                    message: 'Los administradores deben usar /login'
                });
            }
            return res.json({ 
                success: false, 
                message: 'Los clientes deben usar /login'
            });
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.json({ 
                success: false, 
                message: 'Credenciales incorrectas' 
            });
        }
        
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.userEmail = user.email;
        req.session.fullName = user.fullName;
        
        console.log('✅ Login empleado exitoso');
        
        res.json({ 
            success: true, 
            message: 'Login exitoso',
            role: user.role,
            redirectUrl: '/empleados'
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor' 
        });
    }
});


app.post('/api/logout', (req, res) => {
    console.log('🚪 Solicitud de logout recibida');
    console.log('Session ID:', req.sessionID);
    console.log('Usuario actual:', req.session?.user?.email || req.session?.userEmail || 'Sin usuario');
    
    if (req.session) {
        // Guardar referencia antes de destruir
        const userEmail = req.session.user?.email || req.session.userEmail || 'usuario';
        
        // Destruir la sesión COMPLETAMENTE
        req.session.destroy((err) => {
            if (err) {
                console.error('❌ Error destruyendo sesión:', err);
                // Aún así, limpiar la cookie
                res.clearCookie('connect.sid', { path: '/' });
                return res.json({ 
                    success: true, // Devolver success true para que el frontend redirija
                    message: 'Sesión cerrada con advertencias' 
                });
            }
            
            // Limpiar cookie de sesión
            res.clearCookie('connect.sid', { path: '/' });
            
            console.log(`✅ Sesión de ${userEmail} cerrada exitosamente`);
            
            res.json({ 
                success: true, 
                message: 'Sesión cerrada exitosamente' 
            });
        });
    } else {
        console.log('⚠️ No hay sesión activa para cerrar');
        res.clearCookie('connect.sid', { path: '/' });
        res.json({ 
            success: true, 
            message: 'No hay sesión activa' 
        });
    }
});

// ==================== RECUPERACION DE CONTRASEÑA ====================


// Schema para tokens de reset
const resetTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});

const ResetToken = mongoose.model('ResetToken', resetTokenSchema);

// Ruta para solicitar reset
app.post('/api/password-reset/request', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
        return res.json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora
    
    await ResetToken.create({ userId: user._id, token, expiresAt });
    
    // Enviar email (configurar nodemailer)
    // ...
    
    res.json({ success: true, message: 'Email enviado' });
});

// ============== APIs DE ADMIN ==============

app.get('/api/admin/dashboard-stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('📊 Cargando estadísticas del dashboard admin...');
        
        // Total de usuarios (sin contar admins)
        const totalUsers = await User.countDocuments({ role: 'user' });
        console.log('👥 Total usuarios:', totalUsers);
        
        // Reservas activas (futuras)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeReservations = await Reservation.countDocuments({ 
            status: 'active',
            date: { $gte: today }
        });
        console.log('📅 Reservas activas:', activeReservations);
        
        // Órdenes del mes actual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyOrders = await Order.countDocuments({ 
            createdAt: { $gte: startOfMonth },
            status: 'completed'
        });
        console.log('🛒 Órdenes del mes:', monthlyOrders);
        
        // Ingresos del mes
        const monthlyRevenueResult = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: startOfMonth },
                    status: 'completed'
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    total: { $sum: '$total' } 
                } 
            }
        ]);
        
        const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;
        console.log('💰 Ingresos del mes:', monthlyRevenue);
        
        res.json({
            success: true,
            stats: { 
                totalUsers, 
                activeReservations, 
                monthlyOrders, 
                monthlyRevenue 
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar estadísticas',
            error: error.message 
        });
    }
});

// GET: Obtener todos los usuarios
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('👥 Cargando lista de usuarios...');
        
        const users = await User.find(
            { role: 'user' }, 
            '-password'
        ).sort({ createdAt: -1 });
        
        console.log(`✅ ${users.length} usuarios encontrados`);
        
        res.json({ 
            success: true, 
            users: users 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar usuarios',
            error: error.message 
        });
    }
});

// PUT: Actualizar usuario
app.put('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullName, email, phone, status } = req.body;

        console.log('✏️ Actualizando usuario:', userId);

        // Verificar que el email no esté en uso
        const existingUser = await User.findOne({ 
            email: email, 
            _id: { $ne: userId } 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email ya está en uso por otro usuario' 
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fullName, email, phone, status },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        console.log('✅ Usuario actualizado:', updatedUser.fullName);

        res.json({ 
            success: true, 
            message: 'Usuario actualizado correctamente', 
            user: updatedUser 
        });

    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar usuario',
            error: error.message 
        });
    }
});


// DELETE: Eliminar usuario
app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        console.log('🗑️ Eliminando usuario:', userId);

        // No permitir eliminar al mismo admin
        if (userId === req.session.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'No puedes eliminarte a ti mismo' 
            });
        }

        // Eliminar datos relacionados
        await Reservation.deleteMany({ userId: userId });
        await Cart.deleteOne({ userId: userId });
        await Membership.deleteMany({ userId: userId });
        
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        console.log('✅ Usuario eliminado:', deletedUser.fullName);

        res.json({ 
            success: true, 
            message: 'Usuario eliminado correctamente' 
        });

    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar usuario',
            error: error.message 
        });
    }
});

console.log('✅ Rutas de administración configuradas correctamente');

// ==================== GESTIÓN DE EMPLEADOS ====================

// Obtener todos los empleados
app.get('/api/admin/employees', requireAuth, requireAdmin, async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' }).select('-password');
        res.json({ success: true, employees });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar empleados' });
    }
});

// Crear nuevo empleado
app.post('/api/admin/employees', requireAuth, requireAdmin, async (req, res) => {

    try {
        const { fullName, email, phone, password } = req.body;
        
        // Validar datos
        if (!fullName || !email || !phone || !password) {
            return res.json({ success: false, message: 'Todos los campos son requeridos' });
        }
        
        if (password.length < 6) {
            return res.json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        // Verificar si el email ya existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.json({ success: false, message: 'El email ya está registrado' });
        }
        
        // Crear empleado
        const hashedPassword = await bcrypt.hash(password, 10);
        const newEmployee = await User.create({
            fullName,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            role: 'employee',
            status: 'active'
        });
        
        res.json({ 
            success: true, 
            message: 'Empleado creado correctamente',
            employee: {
                _id: newEmployee._id,
                fullName: newEmployee.fullName,
                email: newEmployee.email,
                phone: newEmployee.phone,
                status: newEmployee.status
            }
        });
        
    } catch (error) {
        console.error('Error creando empleado:', error);
        res.status(500).json({ success: false, message: 'Error al crear empleado' });
    }
});

// Actualizar empleado
app.put('/api/admin/employees/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, status, password } = req.body;
        
        const updateData = { fullName, email, phone, status };
        
        // Si hay nueva contraseña, hashearla
        if (password && password.length > 0) {
            if (password.length < 6) {
                return res.json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }
        
        const updatedEmployee = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).select('-password');
        
        if (!updatedEmployee) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Empleado actualizado correctamente',
            employee: updatedEmployee
        });
        
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar empleado' });
    }
});

// Eliminar empleado
app.delete('/api/admin/employees/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedEmployee = await User.findByIdAndDelete(id);
        
        if (!deletedEmployee) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Empleado eliminado correctamente'
        });
        
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar empleado' });
    }
});

// GET: Obtener todas las órdenes
app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('🛒 Cargando órdenes...');
        
        const orders = await Order.find()
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        console.log(`✅ ${orders.length} órdenes encontradas`);

        // Formatear órdenes con información del usuario
        const formattedOrders = orders.map(order => ({
            ...order,
            userInfo: order.userId || { 
                fullName: 'Usuario eliminado', 
                email: 'N/A' 
            }
        }));

        res.json({ 
            success: true, 
            orders: formattedOrders 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo órdenes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar órdenes',
            error: error.message 
        });
    }
});

// GET: Obtener detalles de una orden
app.get('/api/admin/orders/:orderId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log('📦 Cargando detalles de orden:', orderId);
        
        const order = await Order.findById(orderId).populate({
            path: 'userId',
            select: 'fullName email'
        });
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Orden no encontrada' 
            });
        }

        res.json({
            success: true,
            order: {
                _id: order._id,
                items: order.items,
                total: order.total,
                status: order.status,
                createdAt: order.createdAt,
                userInfo: order.userId || { 
                    fullName: 'Usuario eliminado', 
                    email: 'N/A' 
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo detalles de orden:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar detalles de orden',
            error: error.message 
        });
    }
});

// GET: Estadísticas adicionales (Top clases)
app.get('/api/admin/statistics', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('📈 Cargando estadísticas adicionales...');
        
        // Top clases más reservadas
        const topClasses = await Reservation.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$className', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        console.log('✅ Top clases:', topClasses.length);

        res.json({ 
            success: true, 
            stats: { topClasses } 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar estadísticas',
            error: error.message 
        });
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
            date: { $gte: today } // ⭐ SOLO RESERVAS FUTURAS
        }).populate('classId').sort({ date: 1 });

        console.log(`✅ ${reservations.length} reservas futuras encontradas`);

        res.json({ success: true, reservations: reservations });
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        res.json({ success: false, message: 'Error obteniendo reservas' });
    }
});

// ⭐ NUEVA RUTA: Limpiar reservas antiguas automáticamente
app.post('/api/cleanup-old-reservations', requireAuth, async (req, res) => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        
        const result = await Reservation.deleteMany({
            userId: req.session.user.id,
            date: { $lt: yesterday },
            status: 'active'
        });
        
        console.log(`🗑️ ${result.deletedCount} reservas antiguas eliminadas`);
        
        res.json({ 
            success: true, 
            deleted: result.deletedCount,
            message: 'Reservas antiguas eliminadas'
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Error limpiando reservas' });
    }
});


app.post('/api/reserve-class', requireAuth, requireActiveMembership, async (req, res) => {
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

// ==================== API PARA VERIFICAR MEMBRESÍA EN EMPLEADOS ====================
app.post('/api/employee/verify-membership', verificarEmpleado, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                message: 'Usuario requerido'
            });
        }
        
        const membership = await Membership.findOne({
            userId: userId,
            status: 'active'
        }).sort({ createdAt: -1 });
        
        if (!membership) {
            return res.json({
                success: false,
                hasMembership: false,
                message: 'Usuario sin membresía activa'
            });
        }
        
        const today = new Date();
        const endDate = new Date(membership.endDate);
        
        if (endDate < today) {
            return res.json({
                success: false,
                hasMembership: false,
                message: 'Membresía expirada',
                expiredDate: endDate
            });
        }
        
        // Membresía válida
        res.json({
            success: true,
            hasMembership: true,
            membership: {
                planType: membership.planType,
                endDate: membership.endDate,
                daysRemaining: Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando membresía'
        });
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
            'tres-veces': 15000,
            'semanal': 20000,
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

app.post('/api/renew-membership', requireAuth, async (req, res) => {
    try {
        const { planType, paymentMethod, trainingDays } = req.body;
        const userId = req.session.user.id;
        
        console.log('🔄 Procesando renovación:', { planType, paymentMethod, userId });
        
        // Validar plan
        const validPlans = ['mes-libre', 'tres-veces', 'semanal'];
        if (!validPlans.includes(planType)) {
            return res.json({
                success: false,
                message: 'Plan no válido'
            });
        }
        
        // Validar días si es 3 veces
        if (planType === 'tres-veces') {
            if (!trainingDays || trainingDays.length !== 3) {
                return res.json({
                    success: false,
                    message: 'Debes seleccionar exactamente 3 días de entrenamiento'
                });
            }
        }
        
        const prices = {
            'mes-libre': 32000,
            'tres-veces': 15000,
            'semanal': 20000
        };
        
        let finalPrice = prices[planType];
        if (paymentMethod === 'mercadopago') {
            finalPrice = Math.round(finalPrice * 1.05);
        }
        
        // Buscar membresía actual
        const currentMembership = await Membership.findOne({
            userId: userId,
            status: { $in: ['active', 'expired'] }
        }).sort({ createdAt: -1 });
        
        // Calcular fecha de inicio
        let startDate = new Date();
        
        // Si tiene membresía activa y no expiró, extender desde la fecha de vencimiento
        if (currentMembership && currentMembership.status === 'active') {
            const endDate = new Date(currentMembership.endDate);
            if (endDate > new Date()) {
                startDate = endDate;
            }
        }
        
        // Calcular fecha de fin
        const endDate = new Date(startDate);
        if (planType === 'semanal') {
            endDate.setDate(endDate.getDate() + 7);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        
        // Crear nueva membresía
        const membershipData = {
            userId: userId,
            planType: planType,
            price: finalPrice,
            startDate: startDate,
            endDate: endDate,
            status: 'active',
            paymentMethod: paymentMethod
        };
        
        if (planType === 'tres-veces') {
            membershipData.trainingDays = trainingDays;
        }
        
        const newMembership = new Membership(membershipData);
        await newMembership.save();
        
        // Marcar membresía anterior como expirada
        if (currentMembership) {
            currentMembership.status = 'expired';
            await currentMembership.save();
        }
        
        // Crear notificación
        await Notification.create({
            userId: userId,
            type: 'general',
            title: 'Membresía Renovada',
            message: `Tu membresía ${planType} ha sido renovada. Válida hasta ${endDate.toLocaleDateString('es-ES')}`
        });
        
        console.log('✅ Membresía renovada exitosamente');
        
        res.json({
            success: true,
            message: 'Membresía renovada exitosamente',
            membership: {
                planType: newMembership.planType,
                startDate: newMembership.startDate,
                endDate: newMembership.endDate,
                price: newMembership.price
            }
        });
        
    } catch (error) {
        console.error('❌ Error renovando membresía:', error);
        res.status(500).json({
            success: false,
            message: 'Error al renovar membresía'
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
app.post('/api/checkout/complete', requireAuth, async function(req, res) {
    console.log('🛒 Procesando checkout...');
    
    try {
        const { customer, shipping, payment, items } = req.body;
        
        // VALIDACIÓN 1: Verificar que hay items
        if (!items || items.length === 0) {
            console.log('❌ Error: No hay items en el pedido');
            return res.json({
                success: false,
                message: 'No hay productos en el carrito'
            });
        }
        
        // VALIDACIÓN 2: Verificar datos del cliente
        if (!customer || !customer.email || !customer.name) {
            console.log('❌ Error: Datos del cliente incompletos');
            return res.json({
                success: false,
                message: 'Datos del cliente incompletos'
            });
        }
        
        console.log('✅ Validaciones pasadas');
        console.log('📦 Items:', items.length);
        console.log('👤 Cliente:', customer.email);
        
        // Calcular subtotal
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log('💰 Subtotal calculado:', subtotal);
        
        // Aplicar recargo de Mercado Pago si corresponde
        let finalSubtotal = subtotal;
        if (payment && payment.method === 'mercadopago') {
            finalSubtotal = subtotal * 1.05;
            console.log('💳 Recargo MP aplicado:', finalSubtotal);
        }
        
        // Calcular total con envío
        const shippingCost = shipping && shipping.cost ? shipping.cost : 0;
        const total = finalSubtotal + shippingCost;
        console.log('🚚 Costo envío:', shippingCost);
        console.log('💵 Total final:', total);
        
        // Crear la orden
        const newOrder = new Order({
            userId: req.session.user.id,
            items: items,
            total: Math.round(total),
            status: 'completed'
        });
        
        console.log('💾 Guardando orden...');
        await newOrder.save();
        console.log('✅ Orden guardada con ID:', newOrder._id);
        
        // Generar ID corto para mostrar al usuario
        const orderId = newOrder._id.toString().slice(-8).toUpperCase();
        console.log('🎫 Order ID público:', orderId);
        
        // Limpiar el carrito del usuario
        console.log('🧹 Limpiando carrito...');
        await Cart.findOneAndUpdate(
            { userId: req.session.user.id },
            { items: [], updatedAt: new Date() }
        );
        console.log('✅ Carrito limpiado');
        
        // RESPUESTA EXITOSA
        console.log('✅ Checkout completado exitosamente');
        res.json({
            success: true,
            message: 'Compra realizada exitosamente',
            orderId: orderId,
            order: {
                _id: newOrder._id,
                total: newOrder.total,
                items: newOrder.items,
                createdAt: newOrder.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ ERROR CRÍTICO EN CHECKOUT:', error);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Error al procesar la compra. Por favor intenta nuevamente.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
app.post('/api/reserve-class/improved', requireAuth, requireActiveMembership, async (req, res) => {
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
// ==================== FIN DE LOS SCHEMAS ====================


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

// Stats del dashboard empleado
app.get('/api/employee/dashboard-stats', verificarEmpleado, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Datos reales desde la BD
        const todayReservations = await Reservation.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today, $lt: tomorrow }
        });

        const stats = {
            todayClasses: 5, // Esto lo puedes calcular desde Class
            todayAttendance: todayReservations,
            todaySales: todayOrders,
            todayRevenue: 0 // Calcular desde órdenes
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error en dashboard-stats:', error);
        res.status(500).json({ success: false, message: 'Error al cargar estadísticas' });
    }
});

// Buscar miembros
app.get('/api/employee/search-members', verificarEmpleado, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 3) {
            return res.json({ success: true, members: [] });
        }

        const searchTerm = q.toLowerCase();
        const members = await User.find({
            role: 'user',
            $or: [
                { fullName: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ]
        }).select('-password').limit(10);

        res.json({ success: true, members });
    } catch (error) {
        console.error('Error en search-members:', error);
        res.status(500).json({ success: false, message: 'Error al buscar miembros' });
    }
});

// Registrar asistencia
app.post('/api/employee/register-attendance', verificarEmpleado, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                message: 'Usuario requerido'
            });
        }
        
        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        // Verificar membresía activa
        const membership = await Membership.findOne({
            userId: userId,
            status: 'active'
        }).sort({ createdAt: -1 });
        
        if (!membership) {
            return res.json({
                success: false,
                message: 'El usuario no tiene una membresía activa'
            });
        }
        
        // Verificar si ya registró asistencia hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const existingAttendance = await Attendance.findOne({
            userId: userId,
            date: { $gte: today, $lt: tomorrow }
        });
        
        if (existingAttendance) {
            return res.json({
                success: false,
                message: 'El usuario ya registró asistencia hoy'
            });
        }
        
        // Registrar asistencia
        const attendance = new Attendance({
            userId: userId,
            membershipId: membership._id,
            date: new Date(),
            registeredBy: req.session.fullName || 'Empleado',
            registeredByUserId: req.session.userId
        });
        
        await attendance.save();
        
        // Actualizar última asistencia en membresía
        membership.lastAttendance = new Date();
        await membership.save();
        
        console.log(`✅ Asistencia registrada: ${user.fullName}`);
        
        res.json({
            success: true,
            message: 'Asistencia registrada correctamente',
            attendance: attendance
        });
        
    } catch (error) {
        console.error('❌ Error registrando asistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar asistencia'
        });
    }
});

// Obtener asistencias de hoy
app.get('/api/employee/today-attendances', verificarEmpleado, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const attendances = await Attendance.find({
            date: { $gte: today, $lt: tomorrow }
        })
        .populate('userId', 'fullName email phone')
        .sort({ checkInTime: -1 });
        
        res.json({
            success: true,
            attendances: attendances.map(att => ({
                _id: att._id,
                user: {
                    fullName: att.userId?.fullName || 'Usuario',
                    email: att.userId?.email || 'N/A',
                    phone: att.userId?.phone || 'N/A'
                },
                checkInTime: att.checkInTime,
                registeredBy: att.registeredBy
            }))
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar asistencias'
        });
    }
});

// Obtener historial de asistencias
app.get('/api/employee/attendances-history', verificarEmpleado, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        startDate.setHours(0, 0, 0, 0);
        
        const attendances = await Attendance.find({
            date: { $gte: startDate }
        })
        .populate('userId', 'fullName email phone')
        .sort({ date: -1, checkInTime: -1 });
        
        res.json({
            success: true,
            attendances: attendances.map(att => ({
                _id: att._id,
                user: {
                    fullName: att.userId?.fullName || 'Usuario',
                    email: att.userId?.email || 'N/A',
                    phone: att.userId?.phone || 'N/A'
                },
                date: att.date,
                checkInTime: att.checkInTime,
                registeredBy: att.registeredBy
            }))
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar historial'
        });
    }
});

// ============== TAREA AUTOMATIZADA: ELIMINAR USUARIOS INACTIVOS ==============

async function cleanInactiveUsers() {
    try {
        console.log('🧹 Verificando usuarios inactivos...');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Buscar membresías activas sin asistencia en 30 días
        const inactiveMemberships = await Membership.find({
            status: 'active',
            $or: [
                { lastAttendance: { $lt: thirtyDaysAgo } },
                { lastAttendance: null, createdAt: { $lt: thirtyDaysAgo } }
            ]
        }).populate('userId', 'fullName email');
        
        console.log(`⚠️ ${inactiveMemberships.length} membresías inactivas encontradas`);
        
        for (const membership of inactiveMemberships) {
            // Marcar membresía como cancelada
            membership.status = 'cancelled';
            await membership.save();
            
            // Crear notificación
            await Notification.create({
                userId: membership.userId._id,
                type: 'general',
                title: 'Membresía Cancelada por Inactividad',
                message: 'Tu membresía ha sido cancelada debido a 30 días sin asistencia. Contacta con recepción para más información.'
            });
            
            console.log(`🚫 Membresía cancelada: ${membership.userId.fullName}`);
        }
        
        return inactiveMemberships.length;
        
    } catch (error) {
        console.error('❌ Error limpiando usuarios inactivos:', error);
    }
}

// Ejecutar limpieza diaria (agregar junto con las otras tareas automáticas)
setInterval(async () => {
    console.log('\n🔍 Ejecutando limpieza de usuarios inactivos...');
    const cleaned = await cleanInactiveUsers();
    if (cleaned > 0) {
        console.log(`✅ ${cleaned} membresías inactivas procesadas`);
    }
}, 24 * 60 * 60 * 1000); // Cada 24 horas

// Ejecutar al iniciar el servidor
setTimeout(async () => {
    console.log('\n🔍 Limpieza inicial de usuarios inactivos...');
    await cleanInactiveUsers();
}, 10000); // 10 segundos después de iniciar

// Registro de usuario por empleado
app.post('/api/employee/register-user', verificarEmpleado, async (req, res) => {
    try {
        const { 
            fullName, 
            email, 
            phone, 
            address,
            membershipPlan, 
            paymentMethod,
            trainingDays,
            // Para jubilados
            dni,
            age,
            gender,
            // Para 2 personas
            secondPerson
        } = req.body;
        
        // Validar datos básicos
        if (!fullName || !email || !phone || !membershipPlan || !paymentMethod) {
            return res.json({
                success: false,
                message: 'Datos incompletos'
            });
        }
        
        // Verificar que el email no exista
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.json({
                success: false,
                message: 'Ya existe un usuario con este email'
            });
        }
        
        // Generar contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        // Crear usuario
        const newUser = new User({
            fullName,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            role: 'user',
            status: 'active'
        });
        
        await newUser.save();
        
        // Calcular precio
        const prices = {
            'mes-libre': 32000,
            'dos-personas': 28000,
            'tres-veces': 15000,
            'semanal': 20000,
            'dia-clase': 5000,
            'jubilados': 20000
        };
        
        let price = prices[membershipPlan];
        if (paymentMethod === 'mercadopago') {
            price = Math.round(price * 1.05);
        }
        
        // Calcular fecha de vencimiento
        const endDate = new Date();
        if (membershipPlan === 'dia-clase') {
            endDate.setDate(endDate.getDate() + 1);
        } else if (membershipPlan === 'semanal') {
            endDate.setDate(endDate.getDate() + 7);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        
        // Crear membresía
        const membershipData = {
            userId: newUser._id,
            planType: membershipPlan,
            price: price,
            endDate: endDate,
            status: 'active',
            paymentMethod: paymentMethod
        };
        
        // Agregar datos específicos según tipo
        if (membershipPlan === 'tres-veces' && trainingDays) {
            membershipData.trainingDays = trainingDays;
        }
        
        if (membershipPlan === 'jubilados') {
            membershipData.verificationData = {
                dni: dni,
                age: age,
                gender: gender,
                verified: true // Empleado verifica en persona
            };
        }
        
        if (membershipPlan === 'dos-personas' && secondPerson) {
            const membershipCode = generateMembershipCode();
            membershipData.sharedMembership = {
                isShared: true,
                membershipCode: membershipCode,
                mainUserId: newUser._id,
                mainUserName: fullName,
                secondUserName: secondPerson.fullName,
                secondUserActivated: false
            };
            
            // Guardar datos de segunda persona como pendiente
            await PendingUser.create({
                fullName: secondPerson.fullName,
                age: secondPerson.age || 18,
                email: secondPerson.email,
                phone: secondPerson.phone,
                address: secondPerson.address || address,
                membershipCode: membershipCode,
                mainUserId: newUser._id
            });
        }
        
        const membership = new Membership(membershipData);
        await membership.save();
        
        console.log(`✅ Usuario registrado por empleado: ${fullName}`);
        
        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                fullName: newUser.fullName,
                email: newUser.email,
                tempPassword: tempPassword
            },
            membership: {
                planType: membership.planType,
                endDate: membership.endDate,
                membershipCode: membershipData.sharedMembership?.membershipCode
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
});

// Obtener clases de hoy
app.get('/api/employee/today-classes', verificarEmpleado, async (req, res) => {
    try {
        const classes = await Class.find({ active: true });
        
        // Filtrar clases de hoy según scheduleDetails
        const today = new Date();
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = dayNames[today.getDay()];
        
        const todayClasses = [];
        
        for (const classItem of classes) {
            if (classItem.scheduleDetails) {
                const todaySchedule = classItem.scheduleDetails.filter(s => s.day === todayName);
                
                for (const schedule of todaySchedule) {
                    const reservationCount = await Reservation.countDocuments({
                        classId: classItem._id,
                        date: {
                            $gte: today,
                            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                        },
                        status: 'active'
                    });
                    
                    todayClasses.push({
                        classId: classItem._id,
                        className: classItem.name,
                        time: schedule.time,
                        capacity: classItem.capacity,
                        reservations: reservationCount
                    });
                }
            }
        }
        
        res.json({ success: true, classes: todayClasses });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar clases' });
    }
});

// Obtener pedidos pendientes
app.get('/api/employee/pending-orders', verificarEmpleado, async (req, res) => {
    try {
        console.log('📦 Cargando pedidos pendientes para empleado');
        
        // Pedidos con status 'completed' (pagados pero no entregados)
        const pendingOrders = await Order.find({ 
            status: 'completed' // Cambiamos de 'pending' a 'completed'
        })
        .populate('userId', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(100);
        
        console.log(`✅ ${pendingOrders.length} pedidos pendientes encontrados`);
        
        const formattedOrders = pendingOrders.map(order => ({
            _id: order._id,
            customer: {
                name: order.userId?.fullName || 'Cliente eliminado',
                email: order.userId?.email || 'N/A',
                phone: order.userId?.phone || 'N/A'
            },
            items: order.items,
            total: order.total,
            createdAt: order.createdAt,
            status: order.status
        }));
        
        res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar pedidos' });
    }
});

// Marcar pedido como entregado
app.patch('/api/employee/mark-delivered/:orderId', verificarEmpleado, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findByIdAndUpdate(
            orderId,
            { 
                status: 'delivered',
                deliveredAt: new Date(),
                deliveredBy: req.session.fullName || 'Empleado'
            },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }
        
        res.json({ success: true, message: 'Pedido marcado como entregado' });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
});

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abrilcarchedi_db_user:GZ22MDMYUTM22_m@gym-proyecto.vhxnxsq.mongodb.net/?appName=Gym-proyecto';
mongoose.connect(MONGODB_URI, {
})
.then(() => {
    console.log('âœ… Conectado a MongoDB Local');
    initializeData();
    crearUsuariosIniciales(); // ⭐ AGREGAR ESTA LÍNEA
})
.catch(err => console.log('âŒ Error conectando a MongoDB:', err));

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
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

// ________________ Update para el administrador; apartado modificado de la tienda_______________________________________
//-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------

// Schema de Categorías
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    icon: {
        type: String,
        default: 'fas fa-box'
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
categorySchema.index({ slug: 1 });
const Category = mongoose.model('Category', categorySchema);

// Schema de Productos mejorado
const productSchema = new mongoose.Schema({
    productId: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    image: {
        type: String, // URL de la imagen o base64
        default: null
    },
    imageType: {
        type: String, // 'url', 'base64', 'icon'
        default: 'icon'
    },
    icon: {
        type: String, // Clase de Font Awesome
        default: 'fas fa-box'
    },
    stock: {
        type: Number,
        default: 100
    },
    active: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

productSchema.index({ category: 1, active: 1 });
productSchema.index({ featured: 1, active: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Middleware para actualizar updatedAt
productSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Product = mongoose.model('Product', productSchema);

// 2. AGREGAR FUNCIÓN PARA INICIALIZAR PRODUCTOS Y CATEGORÍAS

async function initializeProductsAndCategories() {
    try {
        // Crear categorías por defecto
        const existingCategories = await Category.countDocuments();
        if (existingCategories === 0) {
            await Category.insertMany([
                {
                    name: 'Suplementos',
                    slug: 'suplementos',
                    description: 'Suplementos nutricionales para potenciar tu entrenamiento',
                    icon: 'fas fa-capsules'
                },
                {
                    name: 'Ropa Deportiva',
                    slug: 'ropa',
                    description: 'Ropa cómoda y de calidad para entrenar',
                    icon: 'fas fa-tshirt'
                },
                {
                    name: 'Accesorios',
                    slug: 'accesorios',
                    description: 'Accesorios esenciales para tu entrenamiento',
                    icon: 'fas fa-dumbbell'
                }
            ]);
            console.log('✅ Categorías predefinidas creadas');
        }
        // Crear productos por defecto
        const existingProducts = await Product.countDocuments();
        if (existingProducts === 0) {
            const categories = await Category.find();
            const suplementos = categories.find(c => c.slug === 'suplementos');
            const ropa = categories.find(c => c.slug === 'ropa');
            const accesorios = categories.find(c => c.slug === 'accesorios');

            await Product.insertMany([
                // Suplementos
                {
                    productId: 1,
                    name: 'Proteína Whey',
                    description: 'Proteína de alta calidad para recuperación muscular',
                    price: 15990,
                    category: 'suplementos',
                    categoryId: suplementos._id,
                    icon: 'fas fa-capsules',
                    imageType: 'icon',
                    stock: 50,
                    featured: true,
                    tags: ['proteína', 'recuperación', 'músculo']
                },
                {
                    productId: 2,
                    name: 'Creatina',
                    description: 'Aumenta tu fuerza y potencia en entrenamientos',
                    price: 8990,
                    category: 'suplementos',
                    categoryId: suplementos._id,
                    icon: 'fas fa-flask',
                    imageType: 'icon',
                    stock: 30,
                    tags: ['fuerza', 'potencia', 'rendimiento']
                },
                {
                    productId: 3,
                    name: 'Pre-Workout',
                    description: 'Energía y concentración para tus entrenamientos',
                    price: 12990,
                    category: 'suplementos',
                    categoryId: suplementos._id,
                    icon: 'fas fa-prescription-bottle',
                    imageType: 'icon',
                    stock: 40,
                    tags: ['energía', 'concentración', 'pre-entrenamiento']
                },

                // Ropa Deportiva
                {
                    productId: 4,
                    name: 'Remera FitZone',
                    description: 'Remera oficial de algodón premium',
                    price: 6990,
                    category: 'ropa',
                    categoryId: ropa._id,
                    icon: 'fas fa-tshirt',
                    imageType: 'icon',
                    stock: 100,
                    featured: true,
                    tags: ['remera', 'oficial', 'algodón']
                },
                {
                    productId: 5,
                    name: 'Short Deportivo',
                    description: 'Comodidad y flexibilidad para entrenar',
                    price: 4990,
                    category: 'ropa',
                    categoryId: ropa._id,
                    icon: 'fas fa-running',
                    imageType: 'icon',
                    stock: 80,
                    tags: ['short', 'entrenamiento', 'flexible']
                },
                {
                    productId: 6,
                    name: 'Zapatillas Training',
                    description: 'Soporte y estabilidad para todos los ejercicios',
                    price: 25990,
                    category: 'ropa',
                    categoryId: ropa._id,
                    icon: 'fas fa-shoe-prints',
                    imageType: 'icon',
                    stock: 25,
                    featured: true,
                    tags: ['zapatillas', 'training', 'estabilidad']
                },

                // Accesorios
                {
                    productId: 7,
                    name: 'Guantes de Entrenamiento',
                    description: 'Protección y mejor agarre para tus manos',
                    price: 3990,
                    category: 'accesorios',
                    categoryId: accesorios._id,
                    icon: 'fas fa-mitten',
                    imageType: 'icon',
                    stock: 60,
                    tags: ['guantes', 'protección', 'agarre']
                },
                {
                    productId: 8,
                    name: 'Cinturón de Fuerza',
                    description: 'Soporte lumbar para levantamientos pesados',
                    price: 7990,
                    category: 'accesorios',
                    categoryId: accesorios._id,
                    icon: 'fas fa-dumbbell',
                    imageType: 'icon',
                    stock: 20,
                    tags: ['cinturón', 'soporte', 'levantamiento']
                },
                {
                    productId: 9,
                    name: 'Shaker FitZone',
                    description: 'Botella mezcladora oficial con logo FitZone',
                    price: 2990,
                    category: 'accesorios',
                    categoryId: accesorios._id,
                    icon: 'fas fa-water',
                    imageType: 'icon',
                    stock: 150,
                    featured: true,
                    tags: ['shaker', 'botella', 'oficial']
                }
            ]);
            console.log('✅ Productos predefinidos creados');
            await initializeProductsAndCategories();
        }
    } catch (error) {
        console.error('Error inicializando productos:', error);
    }
}

// 3. AGREGAR LAS APIs DE GESTIÓN DE PRODUCTOS
// Agregar estas rutas después de las APIs existentes

// ============== APIs DE CATEGORÍAS ==============

// Obtener todas las categorías
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({ active: true }).sort({ name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.json({ success: false, message: 'Error obteniendo categorías' });
    }
});

// Crear categoría (Admin)
app.post('/api/admin/categories', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, description, icon } = req.body;

        // Generar slug
        const slug = name.toLowerCase()
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const category = new Category({
            name,
            slug,
            description,
            icon: icon || 'fas fa-box'
        });

        await category.save();

        res.json({ 
            success: true, 
            message: 'Categoría creada exitosamente',
            category 
        });
    } catch (error) {
        console.error('Error creando categoría:', error);
        res.json({ 
            success: false, 
            message: error.code === 11000 ? 'Ya existe una categoría con ese nombre' : 'Error creando categoría'
        });
    }
});

// Actualizar categoría (Admin)
app.put('/api/admin/categories/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, description, icon, active } = req.body;

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, icon, active },
            { new: true }
        );

        if (!category) {
            return res.json({ success: false, message: 'Categoría no encontrada' });
        }

        res.json({ 
            success: true, 
            message: 'Categoría actualizada exitosamente',
            category 
        });
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        res.json({ success: false, message: 'Error actualizando categoría' });
    }
});

// Eliminar categoría (Admin)
app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Verificar si hay productos en esta categoría
        const productsCount = await Product.countDocuments({ categoryId: req.params.id });

        if (productsCount > 0) {
            return res.json({ 
                success: false, 
                message: `No se puede eliminar. Hay ${productsCount} productos en esta categoría`
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        res.json({ 
            success: true, 
            message: 'Categoría eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        res.json({ success: false, message: 'Error eliminando categoría' });
    }
});

app.get('/api/admin/sales-stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { period } = req.query; // 'day', 'week', 'month', 'year'
        
        let startDate = new Date();
        
        switch (period) {
            case 'day':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(startDate.getMonth() - 1); // Por defecto último mes
        }
        
        // Pedidos completados y entregados
        const orders = await Order.find({
            status: { $in: ['completed', 'delivered'] },
            createdAt: { $gte: startDate }
        });
        
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        
        // Pedidos solo entregados
        const deliveredOrders = orders.filter(o => o.status === 'delivered');
        const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
        
        // Productos más vendidos
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (productSales[item.name]) {
                    productSales[item.name] += item.quantity;
                } else {
                    productSales[item.name] = item.quantity;
                }
            });
        });
        
        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));
        
        res.json({
            success: true,
            stats: {
                totalSales,
                totalOrders,
                deliveredOrders: deliveredOrders.length,
                deliveredRevenue,
                pendingOrders: totalOrders - deliveredOrders.length,
                pendingRevenue: totalSales - deliveredRevenue,
                topProducts
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});

// ============== APIs DE PRODUCTOS ==============

// Obtener todos los productos (público)
app.get('/api/products', async (req, res) => {
    try {
        const { category, featured, search } = req.query;

        let query = { active: true };

        if (category && category !== 'all') {
            query.category = category;
        }

        if (featured === 'true') {
            query.featured = true;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const products = await Product.find(query)
            .populate('categoryId', 'name slug icon')
            .sort({ featured: -1, createdAt: -1 });

        res.json({ success: true, products });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.json({ success: false, message: 'Error obteniendo productos' });
    }
});

// Obtener producto por ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoryId', 'name slug icon');

        if (!product) {
            return res.json({ success: false, message: 'Producto no encontrado' });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.json({ success: false, message: 'Error obteniendo producto' });
    }
});

// Obtener todos los productos (Admin) - sin filtros
app.get('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    try {
        const products = await Product.find()
            .populate('categoryId', 'name slug icon')
            .sort({ createdAt: -1 });

        res.json({ success: true, products });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.json({ success: false, message: 'Error obteniendo productos' });
    }
});

// Crear producto (Admin)
app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category, categoryId, image, imageType, icon, stock, featured, tags } = req.body;

        // Validaciones
        if (!name || !description || !price || !category) {
            return res.json({ 
                success: false, 
                message: 'Faltan campos requeridos: nombre, descripción, precio y categoría'
            });
        }

        if (price < 0) {
            return res.json({ 
                success: false, 
                message: 'El precio no puede ser negativo'
            });
        }

        // Generar nuevo productId
        const lastProduct = await Product.findOne().sort({ productId: -1 });
        const newProductId = lastProduct ? lastProduct.productId + 1 : 1;

        const product = new Product({
            productId: newProductId,
            name,
            description,
            price: parseFloat(price),
            category,
            categoryId: categoryId || null,
            image: image || null,
            imageType: imageType || 'icon',
            icon: icon || 'fas fa-box',
            stock: stock || 100,
            featured: featured || false,
            tags: tags || []
        });

        await product.save();

        res.json({ 
            success: true, 
            message: 'Producto creado exitosamente',
            product 
        });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.json({ 
            success: false, 
            message: 'Error creando producto: ' + error.message
        });
    }
});

// Actualizar producto (Admin)
app.put('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category, categoryId, image, imageType, icon, stock, active, featured, tags } = req.body;

        const updateData = {
            name,
            description,
            price: parseFloat(price),
            category,
            categoryId: categoryId || null,
            stock: parseInt(stock) || 0,
            active: active !== undefined ? active : true,
            featured: featured || false,
            tags: tags || [],
            updatedAt: new Date()
        };

        // Actualizar imagen solo si se proporciona
        if (image !== undefined) {
            updateData.image = image;
            updateData.imageType = imageType || 'icon';
        }

        if (icon) {
            updateData.icon = icon;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('categoryId', 'name slug icon');

        if (!product) {
            return res.json({ success: false, message: 'Producto no encontrado' });
        }

        res.json({ 
            success: true, 
            message: 'Producto actualizado exitosamente',
            product 
        });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.json({ success: false, message: 'Error actualizando producto' });
    }
});

// Eliminar producto (Admin)
app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.json({ success: false, message: 'Producto no encontrado' });
        }

        res.json({ 
            success: true, 
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.json({ success: false, message: 'Error eliminando producto' });
    }
});

// Cambiar estado de producto (Admin)
app.patch('/api/admin/products/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.json({ success: false, message: 'Producto no encontrado' });
        }

        product.active = !product.active;
        await product.save();

        res.json({ 
            success: true, 
            message: `Producto ${product.active ? 'activado' : 'desactivado'} exitosamente`,
            product 
        });
    } catch (error) {
        console.error('Error cambiando estado:', error);
        res.json({ success: false, message: 'Error cambiando estado del producto' });
    }
});

// Schema de Instructores
const instructorSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true
    },
    specialties: [{
        type: String,
        enum: ['F.E.C', 'Yoga', 'Spinning', 'Pilates', 'Musculación', 'Cardio']
    }],
    certifications: String,
    bio: String,
    photo: String, // URL o base64
    active: {
        type: Boolean,
        default: true
    },
    assignedClasses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

instructorSchema.index({ fullName: 1, active: 1 });

const Instructor = mongoose.model('Instructor', instructorSchema);

// ==================== APIs DE INSTRUCTORES ====================

// Obtener todos los instructores (Admin)
app.get('/api/admin/instructors', requireAuth, requireAdmin, async (req, res) => {
    try {
        const instructors = await Instructor.find()
            .populate('assignedClasses', 'name schedule')
            .sort({ fullName: 1 });
        
        res.json({ success: true, instructors });
    } catch (error) {
        console.error('Error obteniendo instructores:', error);
        res.status(500).json({ success: false, message: 'Error al cargar instructores' });
    }
});

// Obtener instructores activos (Público)
app.get('/api/instructors/active', async (req, res) => {
    try {
        const instructors = await Instructor.find({ active: true })
            .populate('assignedClasses', 'name schedule')
            .sort({ fullName: 1 });
        
        res.json({ success: true, instructors });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar instructores' });
    }
});

// Crear instructor (Admin)
app.post('/api/admin/instructors', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { fullName, email, phone, specialties, certifications, bio, photo } = req.body;
        
        if (!fullName || !email || !phone) {
            return res.json({ success: false, message: 'Campos requeridos incompletos' });
        }
        
        const existingInstructor = await Instructor.findOne({ email: email.toLowerCase() });
        if (existingInstructor) {
            return res.json({ success: false, message: 'Ya existe un instructor con este email' });
        }
        
        const instructor = new Instructor({
            fullName,
            email: email.toLowerCase(),
            phone,
            specialties: specialties || [],
            certifications,
            bio,
            photo,
            active: true
        });
        
        await instructor.save();
        
        res.json({ 
            success: true, 
            message: 'Instructor creado exitosamente',
            instructor 
        });
    } catch (error) {
        console.error('Error creando instructor:', error);
        res.status(500).json({ success: false, message: 'Error al crear instructor' });
    }
});

// Actualizar instructor (Admin)
app.put('/api/admin/instructors/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { fullName, email, phone, specialties, certifications, bio, photo, active } = req.body;
        
        const instructor = await Instructor.findByIdAndUpdate(
            req.params.id,
            { fullName, email, phone, specialties, certifications, bio, photo, active },
            { new: true, runValidators: true }
        );
        
        if (!instructor) {
            return res.status(404).json({ success: false, message: 'Instructor no encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Instructor actualizado exitosamente',
            instructor 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar instructor' });
    }
});

// Eliminar instructor (Admin)
app.delete('/api/admin/instructors/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const instructor = await Instructor.findByIdAndDelete(req.params.id);
        
        if (!instructor) {
            return res.status(404).json({ success: false, message: 'Instructor no encontrado' });
        }
        
        // Actualizar clases que tenían este instructor
        await Class.updateMany(
            { instructor: instructor.fullName },
            { instructor: 'Instructor FitZone' }
        );
        
        res.json({ 
            success: true, 
            message: 'Instructor eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar instructor' });
    }
});

// Asignar instructor a clase (Admin)
app.post('/api/admin/instructors/:instructorId/assign-class/:classId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { instructorId, classId } = req.params;
        
        const instructor = await Instructor.findById(instructorId);
        const classItem = await Class.findById(classId);
        
        if (!instructor || !classItem) {
            return res.status(404).json({ success: false, message: 'Instructor o clase no encontrada' });
        }
        
        // Agregar clase al instructor
        if (!instructor.assignedClasses.includes(classId)) {
            instructor.assignedClasses.push(classId);
            await instructor.save();
        }
        
        // Actualizar instructor en la clase
        classItem.instructor = instructor.fullName;
        await classItem.save();
        
        res.json({ 
            success: true, 
            message: 'Instructor asignado exitosamente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al asignar instructor' });
    }
});

// ==================== INICIALIZAR INSTRUCTORES POR DEFECTO ====================
// Agregar esta función en initializeData() en server.js

async function initializeInstructors() {
    try {
        const count = await Instructor.countDocuments();
        if (count === 0) {
            const instructors = [
                {
                    fullName: 'Carlos Mendoza',
                    email: 'carlos.mendoza@fitzone.com',
                    phone: '(11) 5555-0001',
                    specialties: ['F.E.C', 'Musculación'],
                    certifications: 'Certificado en Entrenamiento Funcional',
                    bio: 'Instructor con 8 años de experiencia en entrenamiento funcional',
                    active: true
                },
                {
                    fullName: 'Ana García',
                    email: 'ana.garcia@fitzone.com',
                    phone: '(11) 5555-0002',
                    specialties: ['Yoga'],
                    certifications: 'Instructor de Yoga certificado RYT-200',
                    bio: 'Especialista en Hatha y Vinyasa Yoga',
                    active: true
                },
                {
                    fullName: 'Roberto Silva',
                    email: 'roberto.silva@fitzone.com',
                    phone: '(11) 5555-0003',
                    specialties: ['Spinning'],
                    certifications: 'Certificado en Ciclismo Indoor',
                    bio: 'Instructor de spinning con pasión por el ciclismo',
                    active: true
                },
                {
                    fullName: 'María López',
                    email: 'maria.lopez@fitzone.com',
                    phone: '(11) 5555-0004',
                    specialties: ['Pilates'],
                    certifications: 'Certificado en Método Pilates',
                    bio: 'Instructora de Pilates con enfoque en rehabilitación',
                    active: true
                }
            ];
            
            await Instructor.insertMany(instructors);
            console.log('✅ Instructores predefinidos creados');
        }
    } catch (error) {
        console.error('Error inicializando instructores:', error);
    }
}

// ==================== APIs PARA EMPLEADOS ====================

// Stats del dashboard de empleados
app.get('/api/employee/today-classes', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Obtener todas las clases
        const classes = await Class.find({ active: true });
        
        // Filtrar clases de hoy
        const todayClasses = [];
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = dayNames[today.getDay()];
        
        for (const classItem of classes) {
            if (classItem.scheduleDetails) {
                const todaySchedule = classItem.scheduleDetails.filter(s => s.day === todayName);
                
                for (const schedule of todaySchedule) {
                    // Contar reservas
                    const reservationCount = await Reservation.countDocuments({
                        classId: classItem._id,
                        date: {
                            $gte: today,
                            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                        },
                        status: 'active'
                    });
                    
                    todayClasses.push({
                        classId: classItem._id,
                        className: classItem.name,
                        time: schedule.time,
                        capacity: classItem.capacity,
                        reservations: reservationCount
                    });
                }
            }
        }
        
        res.json({ success: true, classes: todayClasses });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar clases' });
    }
});

// Pedidos pendientes
app.get('/api/employee/pending-orders', async (req, res) => {
    try {
        const pendingOrders = await Order.find({ 
            status: { $in: ['pending', 'processing'] }
        })
        .populate('userId', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(20);
        
        const formattedOrders = pendingOrders.map(order => ({
            _id: order._id,
            customer: {
                name: order.userId?.fullName || 'Cliente eliminado',
                email: order.userId?.email || 'N/A',
                phone: order.userId?.phone || 'N/A'
            },
            items: order.items,
            total: order.total,
            createdAt: order.createdAt
        }));
        
        res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar pedidos' });
    }
});

// Marcar pedido como entregado
app.patch('/api/employee/mark-delivered/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: 'completed' },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }
        
        res.json({ success: true, message: 'Pedido marcado como entregado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar pedido' });
    }
});

// Obtener inscriptos de una clase (Empleados)
app.get('/api/employee/class-reservations/:classId', verificarEmpleado, async (req, res) => {
    try {
        const { classId } = req.params;
        
        // Obtener información de la clase
        const classItem = await Class.findById(classId);
        
        if (!classItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Clase no encontrada' 
            });
        }
        
        // Obtener reservas de hoy para esta clase
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const reservations = await Reservation.find({
            classId: classId,
            date: {
                $gte: today,
                $lt: tomorrow
            },
            status: 'active'
        })
        .populate('userId', 'fullName email phone')
        .sort({ time: 1 });
        
        // Formatear respuesta
        const formattedReservations = reservations.map(res => ({
            _id: res._id,
            user: {
                fullName: res.userId?.fullName || 'Usuario',
                email: res.userId?.email || 'N/A',
                phone: res.userId?.phone || 'N/A'
            },
            time: res.time,
            date: res.date,
            createdAt: res.createdAt
        }));
        
        console.log(`✅ ${formattedReservations.length} inscriptos en ${classItem.name}`);
        
        res.json({
            success: true,
            className: classItem.name,
            reservations: formattedReservations
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo inscriptos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar inscriptos' 
        });
    }
});

// Obtener pedidos entregados (Empleados)
app.get('/api/employee/delivered-orders', verificarEmpleado, async (req, res) => {
    try {
        console.log('📦 Cargando pedidos entregados');
        
        // Últimos 30 días de pedidos entregados
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const deliveredOrders = await Order.find({ 
            status: 'delivered',
            deliveredAt: { $gte: thirtyDaysAgo }
        })
        .populate('userId', 'fullName email phone')
        .sort({ deliveredAt: -1 })
        .limit(100);
        
        console.log(`✅ ${deliveredOrders.length} pedidos entregados encontrados`);
        
        const formattedOrders = deliveredOrders.map(order => ({
            _id: order._id,
            customer: {
                name: order.userId?.fullName || 'Cliente eliminado',
                email: order.userId?.email || 'N/A',
                phone: order.userId?.phone || 'N/A'
            },
            items: order.items,
            total: order.total,
            createdAt: order.createdAt,
            deliveredAt: order.deliveredAt,
            deliveredBy: order.deliveredBy,
            status: order.status
        }));
        
        res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar pedidos entregados' });
    }
});

// ============== ACTUALIZAR LA FUNCIÓN initializeData() ====================
// AGREGAR esta llamada dentro de initializeData() existente

// Dentro de initializeData(), después de crear el admin y las clases:
await initializeProductsAndCategories();
