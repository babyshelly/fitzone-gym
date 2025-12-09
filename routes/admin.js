const express = require('express');
const router = express.Router();

// Simulación de datos (luego conectaremos con MongoDB)
let mockUsers = [
    {
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Juan Pérez',
        email: 'juan@email.com',
        phone: '11-1234-5678',
        createdAt: new Date('2024-01-15'),
        status: 'active'
    },
    {
        _id: '507f1f77bcf86cd799439012',
        fullName: 'María González',
        email: 'maria@email.com',
        phone: '11-8765-4321',
        createdAt: new Date('2024-02-20'),
        status: 'active'
    },
    {
        _id: '507f1f77bcf86cd799439013',
        fullName: 'Carlos Rodríguez',
        email: 'carlos@email.com',
        phone: '11-5555-6666',
        createdAt: new Date('2024-03-10'),
        status: 'active'
    }
];

let mockOrders = [
    {
        _id: '607f1f77bcf86cd799439021',
        userId: '507f1f77bcf86cd799439011',
        userInfo: {
            fullName: 'Juan Pérez',
            email: 'juan@email.com'
        },
        items: [
            { name: 'Proteína Whey', quantity: 2, price: 5000 },
            { name: 'Creatina', quantity: 1, price: 3000 }
        ],
        total: 13000,
        createdAt: new Date('2024-12-01'),
        status: 'completed'
    },
    {
        _id: '607f1f77bcf86cd799439022',
        userId: '507f1f77bcf86cd799439012',
        userInfo: {
            fullName: 'María González',
            email: 'maria@email.com'
        },
        items: [
            { name: 'Guantes de Entrenamiento', quantity: 1, price: 2500 }
        ],
        total: 2500,
        createdAt: new Date('2024-12-05'),
        status: 'completed'
    }
];

let mockReservations = [
    { classId: 'F.E.C', userId: '507f1f77bcf86cd799439011', date: new Date() },
    { classId: 'Yoga', userId: '507f1f77bcf86cd799439012', date: new Date() },
    { classId: 'Spinning', userId: '507f1f77bcf86cd799439013', date: new Date() }
];

// GET: Estadísticas del dashboard
router.get('/dashboard-stats', (req, res) => {
    try {
        // Calcular estadísticas
        const totalUsers = mockUsers.length;
        const activeReservations = mockReservations.length;
        
        // Órdenes del mes actual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyOrders = mockOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.getMonth() === currentMonth && 
                   orderDate.getFullYear() === currentYear;
        });
        
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0);
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                activeReservations,
                monthlyOrders: monthlyOrders.length,
                monthlyRevenue
            }
        });
    } catch (error) {
        console.error('Error en dashboard-stats:', error);
        res.status(500).json({ success: false, message: 'Error al cargar estadísticas' });
    }
});

// GET: Obtener todos los usuarios
router.get('/users', (req, res) => {
    try {
        res.json({
            success: true,
            users: mockUsers
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ success: false, message: 'Error al cargar usuarios' });
    }
});

// PUT: Actualizar usuario
router.put('/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, status } = req.body;
        
        const userIndex = mockUsers.findIndex(u => u._id === id);
        
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        mockUsers[userIndex] = {
            ...mockUsers[userIndex],
            fullName,
            email,
            phone,
            status
        };
        
        res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            user: mockUsers[userIndex]
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
});

// DELETE: Eliminar usuario
router.delete('/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const userIndex = mockUsers.findIndex(u => u._id === id);
        
        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        mockUsers.splice(userIndex, 1);
        
        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
});

// GET: Obtener todas las órdenes
router.get('/orders', (req, res) => {
    try {
        res.json({
            success: true,
            orders: mockOrders
        });
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        res.status(500).json({ success: false, message: 'Error al cargar órdenes' });
    }
});

// GET: Obtener detalles de una orden específica
router.get('/orders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const order = mockOrders.find(o => o._id === id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Orden no encontrada' });
        }
        
        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error obteniendo orden:', error);
        res.status(500).json({ success: false, message: 'Error al cargar orden' });
    }
});

// GET: Estadísticas adicionales
router.get('/statistics', (req, res) => {
    try {
        // Contar reservas por clase
        const classCounts = {};
        mockReservations.forEach(reservation => {
            classCounts[reservation.classId] = (classCounts[reservation.classId] || 0) + 1;
        });
        
        const topClasses = Object.entries(classCounts)
            .map(([className, count]) => ({ _id: className, count }))
            .sort((a, b) => b.count - a.count);
        
        res.json({
            success: true,
            stats: {
                topClasses
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error al cargar estadísticas' });
    }
});

module.exports = router;