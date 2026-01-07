// ==================== FUNCIONES PRINCIPALES ====================

function showCustomAlert(type, title, message, callback) {
    showToast(type, message);
    if (callback) setTimeout(callback, 500);
}

// ==================== CREAR CONTENEDOR DE TOASTS ====================
function createToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
}

// ==================== MOSTRAR TOAST ====================
function showToast(type, message, duration = 4000) {
    createToastContainer();
    
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Colores según tipo
    const colors = {
        success: { bg: '#22c55e', icon: '✓' },
        error: { bg: '#ef4444', icon: '✗' },
        warning: { bg: '#f59e0b', icon: '⚠' },
        info: { bg: '#3b82f6', icon: 'ℹ' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
        background: ${color.bg};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 1rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
        cursor: pointer;
        min-width: 300px;
    `;
    
    toast.innerHTML = `
        <div style="font-size: 1.5rem; font-weight: bold;">${color.icon}</div>
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remover después de la duración
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    // Click para cerrar
    toast.addEventListener('click', (e) => {
        if (e.target !== toast.querySelector('button')) {
            toast.remove();
        }
    });
}


// Alerta de confirmación - VERSIÓN CORREGIDA
function showConfirmAlert(title, message, onConfirm, onCancel) {
    // Para confirmaciones, mostrar modal simple
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    overlay.innerHTML = `
        <div style="background: #2d2d2d; border: 3px solid #7f4ca5; border-radius: 20px; padding: 2rem; max-width: 400px; text-align: center;">
            <h3 style="color: #b57edc; margin-bottom: 1rem;">${title}</h3>
            <p style="color: #ccc; margin-bottom: 2rem;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="cancel-btn" style="background: #555; color: white; border: none; padding: 0.8rem 2rem; border-radius: 10px; cursor: pointer; font-size: 1rem;">Cancelar</button>
                <button id="confirm-btn" style="background: #7f4ca5; color: white; border: none; padding: 0.8rem 2rem; border-radius: 10px; cursor: pointer; font-size: 1rem;">Confirmar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('confirm-btn').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
    
    document.getElementById('cancel-btn').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };
    
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    };
}

function closeAlert(element) {
    if (!element) return;
    const overlay = element.classList.contains('custom-alert-overlay') ? element : element.closest('.custom-alert-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

// ==================== FUNCIONES ASÍNCRONAS ====================

async function confirmAsync(title, message) {
    return new Promise((resolve) => {
        showConfirmAlert(title, message, () => resolve(true), () => resolve(false));
    });
}

async function alertAsync(title, message, type = 'info') {
    showToast(type, message);
    return Promise.resolve(true);
}

// ==================== ANIMACIONES CSS ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== OVERRIDE SEGURO DE window.alert ====================
// ==================== OVERRIDE window.alert ====================
window.alert = function(message) {
    showToast('info', message);
};
// Hacer disponibles globalmente
window.showToast = showToast;
window.confirmAsync = confirmAsync;
window.alertAsync = alertAsync;
window.showCustomAlert = showCustomAlert;
window.showConfirmAlert = showConfirmAlert;

console.log('✅ Sistema de toasts FitZone cargado');