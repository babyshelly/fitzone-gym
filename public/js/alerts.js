// ==================== SISTEMA DE MENSAJES DISCRETOS FITZONE ====================
// Sin modales molestos, solo mensajes directos

// Función para mostrar mensaje de error discreto
function showError(message, elementId = null) {
    // Si hay un elemento específico, mostrar el error ahí
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            let errorDiv = element.nextElementSibling;
            if (!errorDiv || !errorDiv.classList.contains('error-message')) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                element.parentNode.insertBefore(errorDiv, element.nextSibling);
            }
            errorDiv.textContent = message;
            errorDiv.style.cssText = `
                color: #ef4444;
                font-size: 0.85rem;
                margin-top: 0.3rem;
                display: block;
            `;
            
            // Remover después de 5 segundos
            setTimeout(() => {
                if (errorDiv.parentNode) errorDiv.remove();
            }, 5000);
        }
    } else {
        // Mostrar en la parte superior de la página
        showTopMessage(message, 'error');
    }
}

// Función para mostrar mensaje de éxito discreto (solo cuando sea necesario)
function showSuccess(message) {
    showTopMessage(message, 'success');
}

// Mensaje superior discreto
function showTopMessage(message, type = 'error') {
    const existing = document.querySelector('.top-message');
    if (existing) existing.remove();
    
    const msg = document.createElement('div');
    msg.className = 'top-message';
    msg.textContent = message;
    msg.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 400px;
        ${type === 'error' 
            ? 'background: #ef4444; color: white;' 
            : 'background: #22c55e; color: white;'}
    `;
    
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => msg.remove(), 300);
    }, 4000);
}

// Limpiar mensajes de error
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    const topMsg = document.querySelector('.top-message');
    if (topMsg) topMsg.remove();
}

// CSS para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .error-message {
        animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Mantener compatibilidad con código antiguo (pero sin modales)
window.showCustomAlert = function(type, title, message, callback) {
    if (type === 'error' || type === 'warning') {
        showError(message);
    } else {
        showSuccess(message);
    }
    if (callback) setTimeout(callback, 100);
};

window.showConfirmAlert = function(title, message, onConfirm, onCancel) {
    // Usar confirm nativo de JavaScript (simple y directo)
    if (confirm(message)) {
        if (onConfirm) onConfirm();
    } else {
        if (onCancel) onCancel();
    }
};

window.showError = showError;
window.showSuccess = showSuccess;
window.clearErrors = clearErrors;

console.log('✅ Sistema de mensajes discretos cargado');