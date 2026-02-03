// ==================== BANNERS PROMOCIONALES FITZONE ==================== //
// Archivo: public/js/promo-banners.js                                      //
// Incluir: <script src="/js/promo-banners.js"></script>                    //
// Sin dependencias externas. Solo usa las variables CSS de style.css.      //
// ======================================================================= //

// ──────────────────────────────────────────────
// CONFIGURACIÓN: editá aquí tus ofertas
// ──────────────────────────────────────────────
const PROMOS = {

    // Banner compacto que aparece cada 6 productos en la tienda
    tienda: [
        {
            texto: '🔥 Oferta relámpago: Proteína Whey al 35% OFF',
            subtexto: 'Solo esta semana – no te la pases',
            boton: 'Ver oferta',
            enlace: '/tienda#proteina-whey'
        },
        {
            texto: '🎁 Comprás 2 suplementos y el tercero gratis',
            subtexto: 'Aplica automáticamente al checkout',
            boton: 'Aprovechar',
            enlace: '/tienda#suplementos'
        },
        {
            texto: '⚡ Nuevo producto: Pre-Workout Pro',
            subtexto: 'Energía máxima para tu entrenamiento',
            boton: 'Conocerlo',
            enlace: '/tienda#pre-workout'
        }
    ],

    // Banner horizontal en la landing page (index)
    index: {
        titulo: '🛒 Tienda FitZone – Suplementos y accesorios',
        descripcion: 'Proteínas, creatina, ropa deportiva y más. Entrega en el gimnasio.',
        boton: 'Ver todos los productos',
        enlace: '/tienda'
    },

    // Banner vertical en el dashboard (sidebar)
    dashboard: {
        icono: 'fas fa-flask',
        titulo: 'Suplementos FitZone',
        descripcion: 'Proteínas, vitaminas y más para potenciar tu entrenamiento.',
        boton: 'Ir a la tienda',
        enlace: '/tienda'
    },

    // Banner flotante (aparece una vez por sesión)
    flotante: {
        titulo: '🆕 Novedad en tienda',
        descripcion: 'Pack de inicio fitness con descuento especial para miembros.',
        boton: 'Ver oferta',
        enlace: '/tienda#pack-inicio'
    }
};

// ──────────────────────────────────────────────
// BANNER COMPACTO – para inyectar entre productos
// ──────────────────────────────────────────────
// Uso en tienda.html:
//   insertPromoBannerCompacto(gridElement, cada6Productos);
//
// O más simple, llamá desde el JS de tienda después
// de renderizar los productos:
//   insertPromosEnTienda('products-grid');

function insertPromosEnTienda(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const products = grid.children;
    const promos = PROMOS.tienda;
    // cuántos productos entre cada promo
    const cadaCuantos = 6;
    let promoIndex = 0;

    // Observador: espera a que los productos estén renderizados
    const observer = new MutationObserver(() => {
        // solo actuar si hay al menos cadaCuantos hijos (productos)
        if (grid.children.length < cadaCuantos) return;
        observer.disconnect();

        // recorremos los hijos del grid y metemos promos cada N
        const items = Array.from(grid.children);
        // borrar promos previos si los hay
        items.filter(el => el.classList.contains('promo-compact'))
             .forEach(el => el.remove());

        const updated = Array.from(grid.children);
        updated.forEach((item, i) => {
            // después del producto en posición cadaCuantos-1, 2*cadaCuantos-1, etc.
            if ((i + 1) % cadaCuantos === 0 && promoIndex < promos.length) {
                const banner = document.createElement('div');
                banner.className = 'promo-compact';
                banner.innerHTML = `
                    <div class="promo-compact-text">
                        <h5>${promos[promoIndex].texto}</h5>
                        <p>${promos[promoIndex].subtexto}</p>
                    </div>
                    <a href="${promos[promoIndex].enlace}" class="promo-compact-btn">
                        ${promos[promoIndex].boton}
                    </a>
                `;
                item.after(banner);
                promoIndex = (promoIndex + 1) % promos.length;
            }
        });
    });

    observer.observe(grid, { childList: true });
}

// ──────────────────────────────────────────────
// BANNER HORIZONTAL – para la landing page
// ──────────────────────────────────────────────
// Uso en index.html:
//   <div id="promo-index"></div>   ← ponelo donde quieras
//   insertPromoHorizontal('promo-index');

function insertPromoHorizontal(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const p = PROMOS.index;
    el.innerHTML = `
        <div class="promo-horizontal">
            <div class="promo-horizontal-text">
                <h3>${p.titulo}</h3>
                <p>${p.descripcion}</p>
            </div>
            <a href="${p.enlace}" class="promo-horizontal-btn">
                <i class="fas fa-arrow-right"></i> ${p.boton}
            </a>
        </div>
    `;
}

// ──────────────────────────────────────────────
// BANNER VERTICAL – para el dashboard
// ──────────────────────────────────────────────
// Uso en dashboard.html:
//   <div id="promo-dashboard"></div>
//   insertPromoVertical('promo-dashboard');

function insertPromoVertical(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const p = PROMOS.dashboard;
    el.innerHTML = `
        <div class="promo-vertical">
            <div class="promo-vertical-icon">
                <i class="${p.icono}"></i>
            </div>
            <h4>${p.titulo}</h4>
            <p>${p.descripcion}</p>
            <a href="${p.enlace}" class="promo-vertical-btn">${p.boton}</a>
        </div>
    `;
}

// ──────────────────────────────────────────────
// BANNER FLOTANTE – aparece una sola vez por sesión
// ──────────────────────────────────────────────
// Uso en cualquier página:
//   showPromoFlotante();            ← aparece inmediatamente
//   showPromoFlotante(4000);        ← aparece después de 4 segundos

function showPromoFlotante(demora = 0) {
    // si ya fue cerrado esta sesión, no vuelve a aparecer
    if (sessionStorage.getItem('promo-flotante-cerrado')) return;

    const p = PROMOS.flotante;

    function crear() {
        if (sessionStorage.getItem('promo-flotante-cerrado')) return;

        const banner = document.createElement('div');
        banner.className = 'promo-floating';
        banner.id = 'promo-flotante';
        banner.innerHTML = `
            <button class="promo-floating-close" onclick="cerrarPromoFlotante()">×</button>
            <h4>${p.titulo}</h4>
            <p>${p.descripcion}</p>
            <a href="${p.enlace}" class="promo-floating-btn">${p.boton}</a>
        `;
        document.body.appendChild(banner);

        // auto-cerrar después de 12 segundos
        setTimeout(cerrarPromoFlotante, 12000);
    }

    if (demora > 0) {
        setTimeout(crear, demora);
    } else {
        crear();
    }
}

function cerrarPromoFlotante() {
    const banner = document.getElementById('promo-flotante');
    if (!banner) return;
    banner.classList.add('hiding');
    setTimeout(() => banner.remove(), 350);
    sessionStorage.setItem('promo-flotante-cerrado', '1');
}