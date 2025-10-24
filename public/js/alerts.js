// ==================== SISTEMA DE ALERTAS PERSONALIZADO FITZONE ====================
// Archivo: public/js/alerts.js

// Función principal para mostrar alertas
function showCustomAlert(type, title, message, callback) {
    // Remover alertas anteriores
    const existingAlerts = document.querySelectorAll('.custom-alert-overlay');
    existingAlerts.forEach(alert => alert.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay show';
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    overlay.innerHTML = `
        <div class="custom-alert-box">
            <div class="custom-alert-header ${type}">
                <div class="custom-alert-icon">${icons[type] || 'ℹ'}</div>
                <h3>${title}</h3>
            </div>
            <div class="custom-alert-body">
                ${message}
            </div>
            <div class="custom-alert-actions">
                <button class="custom-alert-btn primary" onclick="closeCustomAlert(this)">
                    Aceptar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeCustomAlert(overlay);
            if (callback) callback();
        }
    });
    
    // Ejecutar callback al cerrar con botón
    const btn = overlay.querySelector('.custom-alert-btn');
    if (btn) {
        btn.addEventListener('click', function() {
            if (callback) callback();
        });
    }
}

// Función para alertas de confirmación
function showConfirmAlert(title, message, onConfirm, onCancel) {
    // Remover alertas anteriores
    const existingAlerts = document.querySelectorAll('.custom-alert-overlay');
    existingAlerts.forEach(alert => alert.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay show';
    
    overlay.innerHTML = `
        <div class="custom-alert-box">
            <div class="custom-alert-header warning">
                <div class="custom-alert-icon">?</div>
                <h3>${title}</h3>
            </div>
            <div class="custom-alert-body">
                ${message}
            </div>
            <div class="custom-alert-actions">
                <button class="custom-alert-btn secondary btn-cancel">
                    Cancelar
                </button>
                <button class="custom-alert-btn primary btn-confirm">
                    Confirmar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Manejadores de eventos
    const btnCancel = overlay.querySelector('.btn-cancel');
    const btnConfirm = overlay.querySelector('.btn-confirm');
    
    if (btnCancel) {
        btnCancel.addEventListener('click', function() {
            closeCustomAlert(overlay);
            if (onCancel) onCancel();
        });
    }
    
    if (btnConfirm) {
        btnConfirm.addEventListener('click', function() {
            closeCustomAlert(overlay);
            if (onConfirm) onConfirm();
        });
    }
    
    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeCustomAlert(overlay);
            if (onCancel) onCancel();
        }
    });
}

// Función para cerrar alertas
function closeCustomAlert(element) {
    try {
        const overlay = element.closest ? element.closest('.custom-alert-overlay') : element;
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 300);
        }
    } catch (error) {
        console.error('Error cerrando alerta:', error);
    }
}

// Cerrar con tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openAlert = document.querySelector('.custom-alert-overlay.show');
        if (openAlert) {
            closeCustomAlert(openAlert);
        }
    }
});

// Exportar funciones globales
window.showCustomAlert = showCustomAlert;
window.showConfirmAlert = showConfirmAlert;
window.closeCustomAlert = closeCustomAlert;

// Función auxiliar para mostrar notificaciones tipo toast
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `fitzone-toast fitzone-toast-${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--gris-oscuro);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        border-left: 4px solid ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : 'var(--violeta-claro)'};
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

window.showToast = showToast;

console.log('✅ Sistema de alertas FitZone cargado correctamente');