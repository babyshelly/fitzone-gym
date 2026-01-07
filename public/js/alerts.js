// ==================== FUNCIONES PRINCIPALES ====================

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
                <button class="custom-alert-btn primary" data-action="accept">
                    Aceptar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Manejar click en botón
    const acceptBtn = overlay.querySelector('[data-action="accept"]');
    acceptBtn.addEventListener('click', function() {
        closeAlert(overlay);
        if (callback) callback();
    });
    
    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAlert(overlay);
            if (callback) callback();
        }
    });
    
    // Cerrar con ESC
    function handleEscape(e) {
        if (e.key === 'Escape') {
            closeAlert(overlay);
            if (callback) callback();
            document.removeEventListener('keydown', handleEscape);
        }
    }
    document.addEventListener('keydown', handleEscape);
}

// Alerta de confirmación - VERSIÓN CORREGIDA
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
                <button class="custom-alert-btn secondary" data-action="cancel">
                    Cancelar
                </button>
                <button class="custom-alert-btn primary" data-action="confirm">
                    Confirmar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Manejar botones
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    
    confirmBtn.addEventListener('click', function() {
        closeAlert(overlay);
        if (onConfirm) onConfirm();
    });
    
    cancelBtn.addEventListener('click', function() {
        closeAlert(overlay);
        if (onCancel) onCancel();
    });
    
    // Cerrar al hacer clic fuera cuenta como cancelar
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAlert(overlay);
            if (onCancel) onCancel();
        }
    });
    
    // ESC para cancelar
    function handleEscape(e) {
        if (e.key === 'Escape') {
            closeAlert(overlay);
            if (onCancel) onCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    }
    document.addEventListener('keydown', handleEscape);
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
        showConfirmAlert(
            title || 'Confirmación',
            message || '¿Deseas continuar?',
            () => resolve(true),
            () => resolve(false)
        );
    });
}

async function alertAsync(title, message, type = 'info') {
    return new Promise((resolve) => {
        showCustomAlert(type, title, message, () => resolve(true));
    });
}

// ==================== OVERRIDE SEGURO DE window.alert ====================
(function() {
    // Guardar referencia a la función original
    const originalAlert = window.alert;
    
    // Override SOLO window.alert (NO tocar confirm ni prompt)
    window.alert = function(message) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('info', 'Información', message || 'Sin mensaje');
        } else {
            // Fallback a la función original si showCustomAlert no está disponible
            originalAlert.call(window, message);
        }
    };
    
    // ⭐ NO TOCAR window.confirm - dejarlo nativo
    // ⭐ Usar confirmAsync() en el código en su lugar
    
    console.log('✅ Sistema de alertas personalizado cargado');
})();

// Hacer disponibles globalmente
window.confirmAsync = confirmAsync;
window.alertAsync = alertAsync;
window.showCustomAlert = showCustomAlert;
window.showConfirmAlert = showConfirmAlert;

console.log('✅ Sistema de alertas FitZone cargado correctamente');
console.log('📌 Usa confirmAsync() para confirmaciones asíncronas');
console.log('📌 Usa alertAsync() para alertas asíncronas');