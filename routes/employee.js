const express = require('express');
const router = express.Router();

// Middleware para verificar que es empleado
function isEmployee(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    
    // Aquí deberías verificar en la BD que el usuario tiene rol de empleado
    // Por ahora asumimos que está autenticado
    next();
}

// GET: Estadísticas del dashboard del empleado
router.get('/dashboard-stats', isEmployee, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Datos simulados - conectar con tu BD
        const stats = {
            todayClasses: 5,
            todayAttendance: 23,
            todaySales: 7,
            todayRevenue: 45000
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error en dashboard-stats:', error);
        res.status(500).json({ success: false, message: 'Error al cargar estadísticas' });
    }
});

// GET: Buscar miembros
router.get('/search-members', isEmployee, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 3) {
            return res.json({ success: true, members: [] });
        }

        // Buscar en BD - datos simulados
        const members = [
            {
                _id: '1',
                fullName: 'Juan Pérez',
                email: 'juan@email.com',
                dni: '12345678',
                phone: '11-1234-5678'
            },
            {
                _id: '2',
                fullName: 'María González',
                email: 'maria@email.com',
                dni: '87654321',
                phone: '11-8765-4321'
            }
        ];

        const searchTerm = q.toLowerCase();
        const filtered = members.filter(m => 
            m.fullName.toLowerCase().includes(searchTerm) ||
            m.email.toLowerCase().includes(searchTerm) ||
            (m.dni && m.dni.includes(searchTerm))
        );

        res.json({ success: true, members: filtered });
    } catch (error) {
        console.error('Error en search-members:', error);
        res.status(500).json({ success: false, message: 'Error al buscar miembros' });
    }
});

// POST: Registrar asistencia
router.post('/register-attendance', isEmployee, async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Usuario requerido' });
        }

        // Aquí guardarías en la BD:
        // const attendance = new Attendance({
        //     userId,
        //     date: new Date(),
        //     registeredBy: req.session.userId
        // });
        // await attendance.save();

        console.log(`✅ Asistencia registrada para usuario: ${userId}`);

        res.json({ 
            success: true, 
            message: 'Asistencia registrada correctamente',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error registrando asistencia:', error);
        res.status(500).json({ success: false, message: 'Error al registrar asistencia' });
    }
});

// GET: Obtener ventas del día
router.get('/daily-sales', isEmployee, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filtrar órdenes del día actual - datos simulados
        const sales = [
            {
                _id: '507f1f77bcf86cd799439011',
                userInfo: {
                    fullName: 'Juan Pérez',
                    email: 'juan@email.com'
                },
                items: [
                    { name: 'Proteína Whey', quantity: 2, price: 5000 },
                    { name: 'Creatina', quantity: 1, price: 3000 }
                ],
                total: 13000,
                createdAt: new Date(),
                paymentMethod: 'efectivo'
            },
            {
                _id: '507f1f77bcf86cd799439012',
                userInfo: {
                    fullName: 'María González',
                    email: 'maria@email.com'
                },
                items: [
                    { name: 'Guantes de Entrenamiento', quantity: 1, price: 2500 }
                ],
                total: 2500,
                createdAt: new Date(),
                paymentMethod: 'tarjeta'
            }
        ];

        res.json({ success: true, sales });
    } catch (error) {
        console.error('Error obteniendo ventas:', error);
        res.status(500).json({ success: false, message: 'Error al cargar ventas' });
    }
});

// GET: Obtener clases programadas
router.get('/scheduled-classes', isEmployee, async (req, res) => {
    try {
        const { month, year } = req.query;

        // Aquí obtendrías las clases del mes desde la BD
        const classes = [
            {
                _id: '1',
                name: 'F.E.C',
                instructor: 'Carlos Ruiz',
                date: new Date(year, month, 15),
                time: '10:00',
                capacity: 20,
                reservations: 12
            },
            {
                _id: '2',
                name: 'Yoga',
                instructor: 'Ana López',
                date: new Date(year, month, 15),
                time: '18:00',
                capacity: 15,
                reservations: 8
            }
        ];

        res.json({ success: true, classes });
    } catch (error) {
        console.error('Error obteniendo clases:', error);
        res.status(500).json({ success: false, message: 'Error al cargar clases' });
    }
});

// GET: Reporte de asistencias
router.get('/attendance-report', isEmployee, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Aquí obtendrías el reporte de la BD
        const report = {
            totalAttendances: 145,
            averageDaily: 23,
            topMembers: [
                { name: 'Juan Pérez', count: 15 },
                { name: 'María González', count: 12 }
            ]
        };

        res.json({ success: true, report });
    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte' });
    }
});

module.exports = router;