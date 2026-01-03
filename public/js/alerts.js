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

// ==================== OVERRIDE DE ALERTAS NATIVAS ====================
// Esto reemplaza todas las alertas nativas del navegador con nuestras alertas personalizadas

(function() {
    // Guardar referencias a las funciones originales
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;
    
    // Override window.alert()
    window.alert = function(message) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('info', 'Información', message || 'Sin mensaje');
        } else {
            // Fallback a la función original si showCustomAlert no está disponible
            originalAlert.call(window, message);
        }
    };
    
    // Override window.confirm()
    window.confirm = function(message) {
        // Los confirm() sincrónicos no se pueden reemplazar perfectamente con modales asíncronos
        // Pero podemos intentar hacerlo funcionar en la mayoría de casos
        if (typeof showConfirmAlert === 'function') {
            // Crear una promesa que se resuelve con la respuesta del usuario
            let result = false;
            let promiseResolved = false;
            
            showConfirmAlert(
                'Confirmación',
                message || '¿Deseas continuar?',
                () => {
                    result = true;
                    promiseResolved = true;
                },
                () => {
                    result = false;
                    promiseResolved = true;
                }
            );
            
            // NOTA: Esto no es perfecto ya que window.confirm() es síncrono
            // pero nuestro showConfirmAlert es asíncrono
            // La mayoría de los casos funcionarán si el código usa if/else directamente
            return result;
        } else {
            return originalConfirm.call(window, message);
        }
    };
    
    // Override window.prompt()
    window.prompt = function(message, defaultValue) {
        // Similar a confirm, prompt es síncrono
        // Por ahora, usamos la función original
        // En el futuro podríamos crear un showPromptAlert personalizado
        return originalPrompt.call(window, message, defaultValue);
    };
    
    // Interceptar console.error para alertas de error
    const originalConsoleError = console.error;
    console.error = function(...args) {
        // Llamar al console.error original
        originalConsoleError.apply(console, args);
        
        // Si el error parece ser importante, mostrar alerta
        const errorMessage = args.join(' ');
        if (errorMessage.toLowerCase().includes('error') && 
            !errorMessage.includes('404') && 
            !errorMessage.includes('CORS')) {
            // Puedes descomentar esto si quieres alertas para todos los errores
            // showCustomAlert('error', 'Error del Sistema', errorMessage);
        }
    };
    
    console.log('✅ Alertas nativas del navegador reemplazadas con alertas personalizadas');
})();

// ==================== FUNCIÓN HELPER PARA CONFIRM ASÍNCRONO ====================
// Usar esta función cuando necesites un confirm que funcione con async/await

async function confirmAsync(title, message) {
    return new Promise((resolve) => {
        if (typeof showConfirmAlert === 'function') {
            showConfirmAlert(
                title || 'Confirmación',
                message || '¿Deseas continuar?',
                () => resolve(true),
                () => resolve(false)
            );
        } else {
            resolve(window.confirm(message));
        }
    });
}

// Hacer disponible globalmente
window.confirmAsync = confirmAsync;

// ==================== FUNCIÓN HELPER PARA ALERT ASÍNCRONO ====================
async function alertAsync(title, message, type = 'info') {
    return new Promise((resolve) => {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(type, title, message, () => resolve(true));
        } else {
            window.alert(message);
            resolve(true);
        }
    });
}

// Hacer disponible globalmente
window.alertAsync = alertAsync;

console.log('✅ Funciones asíncronas de alerta disponibles: confirmAsync() y alertAsync()');