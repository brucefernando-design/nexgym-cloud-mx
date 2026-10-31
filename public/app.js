const state = {
  db: null,
  screenMode: 'landing', // 'landing' | 'login' | 'superadmin' | 'gym'
  session: null,         // { role: 'superadmin' | 'gym_owner', name, email, gymName }
  loginError: '',
  currentView: 'dashboard',
  posCart: [],
  posSelectedMember: 'PUBLICO',
  posPaymentMethod: 'Efectivo',
  memberFilter: 'todos',
  memberSearch: '',
  selectedBoutiqueClassId: 'CLS-PILATES',
  selectedRoutineMemberId: 'SOC-1001',
  lastAccessResult: null,
  aiMessages: [
    { sender: 'bot', time: '10:12 AM', text: '¡Hola! 👋 Soy Valentina, la recepcionista con IA de *Titanes Fitness & Studio MX*. ¿Te gustaría conocer nuestras promociones de mensualidad, agendar una clase muestra o facturar tu ticket CFDI 4.0?' },
    { sender: 'user', time: '10:13 AM', text: 'Hola! Cuánto cuesta la mensualidad de pesas y qué horarios tienen?' },
    { sender: 'bot', time: '10:13 AM', text: '¡Claro! 💪 La *Mensualidad de Pesas + Cardio* está en *$750 MXN/mes* (sin plazos forzosos) o *$580 MXN* si eres estudiante.\n\n🕒 *Horarios:* Lunes a Viernes de 5:30 AM a 11:00 PM, Sábados y Domingos de 7:00 AM a 4:00 PM.\n\n¿Te mando un link de pago seguro (Stripe / SPEI / OXXO) para inscribirte hoy con *Inscripción Gratis* o prefieres venir por un pase de cortesía con código QR?' }
  ]
};

const ADDON_PRICES = {
  biometrics: { name: 'Control Torniquetes / Huella ZKTeco & Rostro', price: 299, icon: 'fa-fingerprint', includedIn: ['pro', 'boutique'] },
  domiciliacion: { name: 'Domiciliación Automática (Stripe / Conekta / SPEI)', price: 249, icon: 'fa-credit-card', includedIn: ['pro', 'boutique'] },
  routinesApp: { name: 'App Móvil del Socio: Rutinas, Videos y Nutrición', price: 299, icon: 'fa-mobile-screen-button', includedIn: ['pro', 'boutique'] },
  boutiqueMap: { name: 'Mapa Interactivo de Reservas (Bicis / Reformers)', price: 399, icon: 'fa-calendar-check', includedIn: ['boutique'] },
  whatsappAi: { name: 'Agente Recepcionista IA en WhatsApp 24/7', price: 499, icon: 'fa-robot', includedIn: ['boutique'] },
  multiBranch: { name: 'Gestión Multisucursal y Acceso Inter-Clubes', price: 499, icon: 'fa-building', includedIn: ['boutique'] }
};

function formatMXN(amount) {
  return '$' + Number(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN';
}

function hasFeature(featureKey) {
  if (!state.db) return true;
  const planId = state.db.saasConfig.currentPlan;
  const planObj = state.db.plansCatalog[planId];
  if (planObj && planObj.includedFeatures.includes(featureKey)) return true;
  if (state.db.saasConfig.addons && state.db.saasConfig.addons[featureKey]) return true;
  return false;
}

function calculateTenantMRR(tenant) {
  if (!state.db || !tenant) return 599;
  const planObj = state.db.plansCatalog[tenant.plan] || state.db.plansCatalog.basico;
  let total = planObj.price;
  Object.keys(ADDON_PRICES).forEach(key => {
    const included = planObj.includedFeatures.includes(key);
    if (!included && tenant.addons && tenant.addons[key]) {
      total += ADDON_PRICES[key].price;
    }
  });
  return total;
}

function calculateMonthlySaaSTotal() {
  if (!state.db) return 599;
  const planId = state.db.saasConfig.currentPlan;
  const planObj = state.db.plansCatalog[planId];
  let total = planObj ? planObj.price : 599;
  Object.keys(ADDON_PRICES).forEach(key => {
    const included = planObj.includedFeatures.includes(key);
    if (!included && state.db.saasConfig.addons[key]) {
      total += ADDON_PRICES[key].price;
    }
  });
  return total;
}

async function fetchState() {
  const res = await fetch('/api/state');
  state.db = await res.json();
  syncScreensVisibility();
}

function syncScreensVisibility() {
  const landingEl = document.getElementById('landing-screen');
  const loginEl = document.getElementById('login-screen');
  const superEl = document.getElementById('superadmin-screen');
  const gymEl = document.getElementById('gym-workspace');

  landingEl.classList.add('hidden');
  loginEl.classList.add('hidden');
  superEl.classList.add('hidden');
  gymEl.classList.add('hidden');
  gymEl.classList.remove('flex');

  if (state.screenMode === 'landing') {
    landingEl.classList.remove('hidden');
    landingEl.innerHTML = renderLandingScreen();
  } else if (state.screenMode === 'login') {
    loginEl.classList.remove('hidden');
    loginEl.innerHTML = renderLoginScreen();
  } else if (state.screenMode === 'superadmin') {
    superEl.classList.remove('hidden');
    superEl.innerHTML = renderSuperAdminScreen();
  } else {
    gymEl.classList.remove('hidden');
    gymEl.classList.add('flex');
    updateHeaderAndNav();
    renderCurrentView();
  }
}

/* ============================================================================
   0. PÁGINA COMERCIAL DEL SAAS (LANDING PAGE PÚBLICA PARA VENDER EL SOFTWARE)
============================================================================ */
function renderLandingScreen() {
  return `
    <!-- Navbar Comercial -->
    <nav class="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800/80 px-6 py-4">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <i class="fa-solid fa-dumbbell text-slate-950 text-lg"></i>
          </div>
          <div>
            <span class="font-black text-lg text-white tracking-tight">NexGym Cloud <span class="text-emerald-400">MX</span></span>
            <span class="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Hecho para México</span>
          </div>
        </div>

        <div class="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <a href="#funciones" class="hover:text-emerald-400 transition">¿Qué incluye?</a>
          <a href="#torniquetes" class="hover:text-emerald-400 transition">Torniquetes & Offline</a>
          <a href="#precios" class="hover:text-emerald-400 transition">Planes y Precios</a>
          <a href="#modulos" class="hover:text-emerald-400 transition">Módulos Extra</a>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="window.app.openLoginScreen()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-2">
            <i class="fa-solid fa-right-to-bracket text-emerald-400"></i>
            <span>Iniciar Sesión Clientes</span>
          </button>
          <a href="#precios" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-emerald-500/20">
            Ver Planes desde $599
          </a>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative overflow-hidden py-16 sm:py-24 px-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-slate-950">
      <div class="max-w-5xl mx-auto text-center space-y-6">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          <i class="fa-solid fa-bolt"></i>
          <span>La evolución en la nube de los sistemas de escritorio tradicionales en México</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          Administra tu Gimnasio, Torniquetes y <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Facturación CFDI 4.0</span> en un solo lugar
        </h1>

        <p class="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Diseñado específicamente para <strong>gimnasios de pesas, boxes de CrossFit y estudios boutique en México</strong>. Controla tu recepción con cortes de caja antifraude, abre torniquetes por huella/rostro incluso si se cae el internet y automatiza tus cobros con Stripe, SPEI y WhatsApp IA.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button onclick="window.app.openLoginScreen()" class="px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-xl shadow-emerald-500/25 flex items-center gap-2">
            <span>Acceder a la Plataforma (Login)</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
          <a href="#precios" class="px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm border border-slate-700 transition">
            Conocer Planes y Módulos
          </a>
        </div>

        <!-- Trust Badges MX -->
        <div class="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-xs text-slate-400">
          <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-center gap-2">
            <i class="fa-solid fa-file-invoice-dollar text-emerald-400"></i>
            <span>CFDI 4.0 SAT Nativo</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-center gap-2">
            <i class="fa-solid fa-fingerprint text-sky-400"></i>
            <span>ZKTeco & Hikvision</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-center gap-2">
            <i class="fa-solid fa-credit-card text-indigo-400"></i>
            <span>Stripe MX / SPEI / OXXO</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-center gap-2">
            <i class="fa-brands fa-whatsapp text-emerald-400"></i>
            <span>Alertas & IA WhatsApp</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Sección: ¿Qué puede hacer quien compra el SaaS? -->
    <section id="funciones" class="py-16 px-6 max-w-7xl mx-auto space-y-12">
      <div class="text-center space-y-2 max-w-3xl mx-auto">
        <span class="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Todo lo que tu gimnasio necesita</span>
        <h2 class="text-3xl font-black text-white">¿Qué puedes hacer con NexGym Cloud MX?</h2>
        <p class="text-sm text-slate-400">Empieza con el módulo básico de recepción y facturación, y agrega potencia conforme tu gimnasio crezca.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl">
            <i class="fa-solid fa-cash-register"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">1. Punto de Venta (POS) y Corte de Caja Ciego</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Cobra mensualidades, visitas por día, aguas y suplementos en segundos. El <strong>Corte de Caja Ciego Antifraude</strong> obliga al recepcionista a contar el efectivo físico sin saber cuánto espera el sistema, eliminando robos hormiga.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">2. Autofacturación CFDI 4.0 por Código QR</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Olvídate de capturar constancias fiscales a mano. Cada ticket impreso de 80mm incluye un <strong>Código QR y Folio Único</strong> para que el socio genere su factura CFDI 4.0 (Clave SAT <code>93141500</code>) en 30 segundos desde su celular.
          </p>
        </div>

        <div id="torniquetes" class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center text-xl">
            <i class="fa-solid fa-fingerprint"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">3. Torniquetes, Huella y Rostro (Modo Offline)</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Compatible con lectores <strong>ZKTeco, Hikvision y códigos QR</strong>. Nuestro puente local guarda en caché el padrón de socios activos para que <strong>tu torniquete siga abriendo en 0.3 segundos aunque se caiga el internet</strong>.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-xl">
            <i class="fa-solid fa-credit-card"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">4. Domiciliación Bancaria y Links de Pago</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Asegura tu flujo de efectivo mensual domiciliando tarjetas de crédito y débito con <strong>Stripe México y Conekta</strong>, o envía links de pago por WhatsApp con soporte para transferencia SPEI y OXXO Pay.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center text-xl">
            <i class="fa-solid fa-mobile-screen-button"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">5. App del Socio: Rutinas, Videos y Nutrición</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Tus socios llevan en su celular su pase QR de acceso, sus días restantes de vigencia, su <strong>rutina personalizada con videos explicativos</strong> y el historial de su peso y porcentaje de grasa corporal.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl">
            <i class="fa-solid fa-calendar-check"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">6. Mapa Boutique (Bicis/Reformers) + IA WhatsApp</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Ideal para estudios de <strong>Pilates Reformer, Indoor Cycling y Funcional</strong>: tus clientes eligen exactamente el número de su cama o bici en un mapa interactivo, mientras nuestra IA atiende WhatsApp 24/7.
          </p>
        </div>
      </div>
    </section>

    <!-- Sección de Precios ("El Punto Dulce") -->
    <section id="precios" class="py-16 px-6 bg-slate-900/50 border-y border-slate-800">
      <div class="max-w-7xl mx-auto space-y-10">
        <div class="text-center space-y-2 max-w-3xl mx-auto">
          <span class="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Precios Transparentes en Pesos Mexicanos</span>
          <h2 class="text-3xl font-black text-white">Planes Diseñados para el Mercado Mexicano</h2>
          <p class="text-sm text-slate-400">Sin plazos forzosos, sin cobros en dólares y con <strong>$0 MXN de costo de instalación</strong>.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Plan Básico -->
          <div class="p-7 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div class="space-y-4">
              <div>
                <span class="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">Gimnasios en Crecimiento</span>
                <h3 class="text-xl font-black text-white mt-3">Plan Básico (BDK Cloud)</h3>
                <div class="text-4xl font-black text-white mt-2">$599 <span class="text-xs font-normal text-slate-400">MXN / mes</span></div>
                <p class="text-xs text-slate-400 mt-2">Todo lo necesario para controlar tu recepción y facturar sin complicaciones.</p>
              </div>
              <ul class="space-y-2.5 text-xs text-slate-200 pt-3 border-t border-slate-800">
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Recepción POS</strong> y Corte de Caja Antifraude</li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i>Hasta <strong>150 socios activos</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i>Control de Acceso con <strong>Código QR</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i>Recordatorios de cobro por <strong>WhatsApp</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Portal y Link de Autofacturación CFDI 4.0</strong></li>
              </ul>
            </div>
            <button onclick="window.app.openLoginScreen()" class="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition">
              Comenzar con Plan Básico →
            </button>
          </div>

          <!-- Plan Pro -->
          <div class="p-7 rounded-3xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border-2 border-emerald-500 flex flex-col justify-between shadow-2xl shadow-emerald-500/10 relative">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-500 text-slate-950">Más Contratado</span>
                <span class="text-xs text-emerald-400 font-bold">$0 Instalación</span>
              </div>
              <div>
                <h3 class="text-xl font-black text-white mt-1">Plan Pro (Full Gym)</h3>
                <div class="text-4xl font-black text-white mt-2">$1,199 <span class="text-xs font-normal text-slate-400">MXN / mes</span></div>
                <p class="text-xs text-slate-300 mt-2">Automatización total con biometría, domiciliación bancaria y App de rutinas.</p>
              </div>
              <ul class="space-y-2.5 text-xs text-slate-100 pt-3 border-t border-slate-800">
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i>Todo lo del Plan Básico incluido</li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Socios y Staff Ilimitados</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Conexión Torniquetes, Huella y Rostro (Offline)</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Domiciliación con Stripe, Conekta y SPEI</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>App Web/Móvil con Rutinas y Progreso Corporal</strong></li>
              </ul>
            </div>
            <button onclick="window.app.openLoginScreen()" class="mt-8 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-emerald-500/20">
              Elegir Plan Pro →
            </button>
          </div>

          <!-- Plan Boutique / Cadenas -->
          <div class="p-7 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div class="space-y-4">
              <div>
                <span class="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">Estudios Boutique y Cadenas</span>
                <h3 class="text-xl font-black text-white mt-3">Plan Boutique & IA</h3>
                <div class="text-4xl font-black text-white mt-2">$2,499 <span class="text-xs font-normal text-slate-400">MXN / mes</span></div>
                <p class="text-xs text-slate-400 mt-2">La experiencia más avanzada para estudios de Pilates, Cycling y cadenas multisucursal.</p>
              </div>
              <ul class="space-y-2.5 text-xs text-slate-200 pt-3 border-t border-slate-800">
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i>Todo lo del Plan Pro incluido</li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Mapa Interactivo de Lugares (Bicis / Reformers)</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Recepcionista con IA en WhatsApp 24/7</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Gestión Multisucursal y Acceso Inter-Clubes</strong></li>
                <li><i class="fa-solid fa-check text-emerald-400 mr-2"></i><strong>Ahorra más del 50% frente a Buq ($0 Setup)</strong></li>
              </ul>
            </div>
            <button onclick="window.app.openLoginScreen()" class="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition">
              Elegir Plan Boutique →
            </button>
          </div>
        </div>

        <!-- Módulos a la Carta -->
        <div id="modulos" class="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-lg font-extrabold text-white">¿Empiezas con el Plan Básico ($599) y solo necesitas un módulo extra?</h3>
              <p class="text-xs text-slate-400">Nuestro sistema es 100% modular. Puedes agregar únicamente el módulo que necesites en cualquier momento:</p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            ${Object.values(ADDON_PRICES).map(a => `
              <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <span class="font-semibold text-slate-200"><i class="fa-solid ${a.icon} text-emerald-400 mr-2"></i>${a.name}</span>
                <span class="font-extrabold text-emerald-400 shrink-0">+$${a.price}/mes</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-10 px-6 border-t border-slate-900 text-center text-xs text-slate-500 space-y-2">
      <div class="font-bold text-slate-300">NexGym Cloud MX — Software para Gimnasios y Centros Fitness en México</div>
      <div>Facturación CFDI 4.0 SAT • Control Biométrico ZKTeco/Hikvision • Cobros Recurrentes Stripe MX</div>
    </footer>
  `;
}

/* ============================================================================
   1. PANTALLA DE LOGIN LIMPIA (SIN EXPONER EL SUPERADMIN NI DATOS DE OTROS GYMS)
============================================================================ */
function renderLoginScreen() {
  return `
    <div class="max-w-md w-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/95 shadow-2xl p-8 sm:p-10 space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <i class="fa-solid fa-dumbbell text-slate-950 text-xl"></i>
          </div>
          <div>
            <div class="font-black text-xl text-white tracking-tight">NexGym Cloud <span class="text-emerald-400">MX</span></div>
            <div class="text-xs text-slate-400">Acceso a tu Gimnasio en la Nube</div>
          </div>
        </div>
        <button onclick="window.app.openLandingScreen()" class="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition">
          ← Volver al inicio
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <h1 class="text-2xl font-extrabold text-white">Iniciar Sesión</h1>
          <p class="text-xs text-slate-400 mt-1">Ingresa el correo y contraseña asignados a tu gimnasio.</p>
        </div>

        ${state.loginError ? `
          <div class="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-medium flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation text-rose-400"></i>
            <span>${state.loginError}</span>
          </div>
        ` : ''}

        <form onsubmit="window.app.submitLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico:</label>
            <div class="relative">
              <i class="fa-solid fa-envelope absolute left-3.5 top-3 text-slate-500 text-xs"></i>
              <input id="login-email" type="email" required placeholder="correo@tugimnasio.mx" class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña:</label>
            <div class="relative">
              <i class="fa-solid fa-lock absolute left-3.5 top-3 text-slate-500 text-xs"></i>
              <input id="login-password" type="password" required placeholder="••••••••" class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <button type="submit" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
            <span>Entrar a mi Gimnasio</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      </div>

      <div class="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span><i class="fa-solid fa-lock text-emerald-400 mr-1"></i>Conexión Encriptada SSL</span>
        <span>Soporte México 24/7</span>
      </div>
    </div>
  `;
}

/* ============================================================================
   CONSOLA MAESTRA SUPERADMIN (EXCLUSIVA PARA TI COMO DUEÑO DEL SAAS)
============================================================================ */
function renderSuperAdminScreen() {
  const db = state.db;
  const tenants = db.tenants || [];
  const activeTenants = tenants.filter(t => t.status === 'activo');
  const totalMRR = activeTenants.reduce((sum, t) => sum + calculateTenantMRR(t), 0);
  const totalARR = totalMRR * 12;
  const totalMembersAcrossCloud = tenants.reduce((sum, t) => sum + (Number(t.membersCount) || 0), 0);

  return `
    <!-- SuperAdmin Header -->
    <header class="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-purple-500/30 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-30">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <i class="fa-solid fa-crown text-amber-300 text-lg"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-black text-white text-base">NexGym Cloud MX — <span class="text-purple-400">SuperAdmin HQ</span></span>
            <span class="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">Dueño del SaaS</span>
          </div>
          <div class="text-xs text-slate-400">Control central de licencias, facturación recurrente de gimnasios y activación de módulos a la carta.</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button onclick="window.app.openNewTenantModal()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <i class="fa-solid fa-plus-circle"></i> Dar de Alta Nuevo Gimnasio Cliente
        </button>
        <button onclick="window.app.logout()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5">
          <i class="fa-solid fa-right-from-bracket text-rose-400"></i> Cerrar Sesión
        </button>
      </div>
    </header>

    <div class="max-w-7xl w-full mx-auto p-6 space-y-6 pb-20">
      <!-- KPIs Financieros de Tu Negocio SaaS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-gradient-to-br from-purple-950/50 to-slate-900 border border-purple-500/30">
          <div class="flex items-center justify-between text-xs text-purple-300 font-semibold">
            <span>Tu Ingreso Mensual (MRR)</span>
            <i class="fa-solid fa-sack-dollar text-emerald-400 text-base"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2">${formatMXN(totalMRR)}</div>
          <div class="text-[11px] text-slate-400 mt-1">Sumando planes base + módulos extra</div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Ingreso Anual Proyectado (ARR)</span>
            <i class="fa-solid fa-chart-line text-sky-400 text-base"></i>
          </div>
          <div class="text-2xl font-black text-emerald-400 mt-2">${formatMXN(totalARR)}</div>
          <div class="text-[11px] text-slate-400 mt-1">100% margen software en la nube</div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Gimnasios Clientes (Tenants)</span>
            <i class="fa-solid fa-dumbbell text-amber-400 text-base"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2">${activeTenants.length} <span class="text-xs font-normal text-slate-400">activos de ${tenants.length}</span></div>
          <div class="text-[11px] text-emerald-400 mt-1">Cero costo de instalación ($0 Setup)</div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Socios Totales en tu Nube</span>
            <i class="fa-solid fa-users text-purple-400 text-base"></i>
          </div>
          <div class="text-2xl font-black text-white mt-2">${totalMembersAcrossCloud.toLocaleString('es-MX')}</div>
          <div class="text-[11px] text-slate-400 mt-1">Operando en CDMX, GDL, MTY y QRO</div>
        </div>
      </div>

      <!-- Lista de Gimnasios Clientes y Control de Módulos por Gimnasio -->
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-xl font-extrabold text-white">Gimnasios Clientes Suscritos a tu SaaS</h2>
            <p class="text-xs text-slate-400">Desde aquí puedes cambiarles el plan ($599 / $1,199 / $2,499), encender o apagar módulos extra a la carta, suspender por falta de pago o entrar a su panel.</p>
          </div>
        </div>

        <div class="space-y-4">
          ${tenants.map(t => {
            const mrr = calculateTenantMRR(t);
            const planObj = db.plansCatalog[t.plan] || db.plansCatalog.basico;
            return `
              <div class="p-5 rounded-2xl bg-slate-900 border ${t.status === 'suspendido' ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'} space-y-4">
                <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2.5 flex-wrap">
                      <span class="text-lg font-extrabold text-white">${t.gymName}</span>
                      <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">${t.id}</span>
                      <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${t.status === 'activo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}">
                        ${t.status === 'activo' ? '● SUSCRIPCIÓN ACTIVA' : '✕ SUSPENDIDO POR FALTA DE PAGO'}
                      </span>
                    </div>
                    <div class="text-xs text-slate-400">
                      Dueño: <strong class="text-slate-200">${t.ownerName}</strong> • Login: <code class="text-emerald-400">${t.email}</code> (Contraseña: <code class="text-amber-300">${t.password}</code>) • Ciudad: ${t.city} • RFC: <span class="mono">${t.rfcEmisor}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 flex-wrap">
                    <div class="text-right mr-2">
                      <div class="text-[11px] text-slate-400">Cobro Mensual a este Gym:</div>
                      <div class="text-xl font-black text-emerald-400">${formatMXN(mrr)}<span class="text-xs font-normal text-slate-400">/mes</span></div>
                    </div>

                    <button onclick="window.app.impersonateTenant('${t.id}')" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                      <i class="fa-solid fa-arrow-up-right-from-square"></i> Entrar al Panel del Gym
                    </button>

                    <button onclick="window.app.toggleTenantStatus('${t.id}', '${t.status === 'activo' ? 'suspendido' : 'activo'}')" class="px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                      t.status === 'activo'
                        ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                    }">
                      <i class="fa-solid ${t.status === 'activo' ? 'fa-ban' : 'fa-rotate-right'} mr-1"></i>
                      ${t.status === 'activo' ? 'Suspender Gym' : 'Reactivar Gym'}
                    </button>
                  </div>
                </div>

                <!-- Selector de Plan Base + Interruptores de Módulos Add-On para este Gimnasio -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div class="lg:col-span-4 space-y-1.5">
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Plan Base Contratado:</label>
                    <div class="grid grid-cols-3 gap-1.5">
                      ${['basico', 'pro', 'boutique'].map(pKey => `
                        <button onclick="window.app.updateTenantPlan('${t.id}', '${pKey}')" class="py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          t.plan === pKey
                            ? 'bg-purple-600 border-purple-400 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }">
                          ${pKey === 'basico' ? 'Básico $599' : pKey === 'pro' ? 'Pro $1,199' : 'Boutique $2,499'}
                        </button>
                      `).join('')}
                    </div>
                  </div>

                  <div class="lg:col-span-8 space-y-1.5">
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Módulos Integrados / Add-Ons Activos para ${t.gymName}:</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      ${Object.entries(ADDON_PRICES).map(([addonKey, addonObj]) => {
                        const includedInPlan = planObj.includedFeatures.includes(addonKey);
                        const isAddonOn = Boolean(t.addons && t.addons[addonKey]);
                        const active = includedInPlan || isAddonOn;

                        return `
                          <button
                            ${includedInPlan ? 'disabled' : `onclick="window.app.toggleTenantAddon('${t.id}', '${addonKey}', ${!isAddonOn})"`}
                            class="p-2 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                              includedInPlan
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 opacity-85 cursor-default'
                                : active
                                ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                            }"
                          >
                            <div class="truncate">
                              <div class="text-[11px] font-bold truncate"><i class="fa-solid ${addonObj.icon} mr-1"></i>${addonObj.name.split(' ')[0]} ${addonObj.name.split(' ')[1]}</div>
                              <div class="text-[10px]">${includedInPlan ? 'Incluido en Plan' : `+$${addonObj.price}/mes`}</div>
                            </div>
                            <span class="text-xs font-extrabold shrink-0">${active ? 'ON' : 'OFF'}</span>
                          </button>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function updateHeaderAndNav() {
  if (!state.db) return;
  const cfg = state.db.saasConfig;

  document.getElementById('header-gym-name').textContent = cfg.gymName;

  // Mostrar u ocultar controles exclusivos de SuperAdmin
  const btnSuper = document.getElementById('btn-go-superadmin');
  const planSwitcher = document.getElementById('header-plan-switcher');
  const isSuper = Boolean(state.session && state.session.role === 'superadmin');
  if (btnSuper) {
    btnSuper.classList.toggle('hidden', !isSuper);
    btnSuper.classList.toggle('flex', isSuper);
  }
  if (planSwitcher) {
    planSwitcher.classList.toggle('hidden', !isSuper);
    planSwitcher.classList.toggle('flex', isSuper);
  }

  // Branch selector
  const branchSelect = document.getElementById('branch-selector');
  const multiEnabled = hasFeature('multiBranch');
  branchSelect.innerHTML = state.db.branches.map(b => {
    const locked = !multiEnabled && b.id !== 'suc-1';
    return `<option value="${b.id}" ${cfg.activeBranchId === b.id ? 'selected' : ''}>${b.name}${locked ? ' 🔒 (Módulo Multisucursal)' : ''}</option>`;
  }).join('');

  // Plan buttons
  ['basico', 'pro', 'boutique'].forEach(p => {
    const btn = document.getElementById(`plan-btn-${p}`);
    if (cfg.currentPlan === p) {
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow';
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white';
    }
  });

  // Offline status
  const dot = document.getElementById('offline-dot');
  const label = document.getElementById('offline-label');
  const btnOffline = document.getElementById('btn-offline-sim');
  if (cfg.offlineModeSimulated) {
    dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
    label.textContent = 'MODO OFFLINE (Caché Local SQLite Activo)';
    btnOffline.className = 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition bg-amber-500/20 border-amber-500/50 text-amber-300';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    label.textContent = 'Nube + Bridge Torniquete: Online';
    btnOffline.className = 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-800';
  }

  // Monthly price in header
  document.getElementById('header-mrr-price').textContent = '$' + calculateMonthlySaaSTotal().toLocaleString('es-MX');

  // Member count badge
  const maxMembers = state.db.plansCatalog[cfg.currentPlan].maxMembers;
  const maxLabel = maxMembers > 10000 ? 'Ilimitados' : maxMembers;
  document.getElementById('nav-members-badge').textContent = `${state.db.members.length}/${maxLabel}`;

  // Biometrics badge
  const bioBadge = document.getElementById('badge-biometrics');
  if (hasFeature('biometrics')) {
    bioBadge.textContent = 'QR + Huella/Rostro';
    bioBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400';
  } else {
    bioBadge.textContent = 'Solo QR';
    bioBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300';
  }

  // Lock badges on sidebar
  const lockMap = [
    { key: 'domiciliacion', elId: 'lock-domiciliacion', price: '+$249' },
    { key: 'routinesApp', elId: 'lock-routinesApp', price: '+$299' },
    { key: 'boutiqueMap', elId: 'lock-boutiqueMap', price: '+$399' },
    { key: 'whatsappAi', elId: 'lock-whatsappAi', price: '+$499' }
  ];
  lockMap.forEach(item => {
    const el = document.getElementById(item.elId);
    if (!el) return;
    if (hasFeature(item.key)) {
      el.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> Activo';
      el.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400';
    } else {
      el.innerHTML = `<i class="fa-solid fa-lock mr-0.5"></i> ${item.price}`;
      el.className = 'text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
  });

  // Active nav highlight
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const v = btn.getAttribute('data-nav');
    if (v === state.currentView) {
      btn.className = 'nav-btn w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    } else {
      btn.className = 'nav-btn w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800/70 hover:text-slate-200';
    }
  });
}

function renderModuleUpsellBanner(featureKey, title, subtitle) {
  if (hasFeature(featureKey)) return '';
  const addon = ADDON_PRICES[featureKey];
  return `
    <div class="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-slate-900 border border-amber-500/40 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xl">
          <i class="fa-solid fa-lock"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-sm">${title}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">Módulo Add-On +$${addon.price} MXN/mes</span>
          </div>
          <p class="text-xs text-slate-300 mt-0.5">${subtitle}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="window.app.toggleAddon('${featureKey}', true)" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20">
          <i class="fa-solid fa-bolt mr-1"></i> Activar Módulo Ahora (+$${addon.price}/mes)
        </button>
        <button onclick="window.app.switchPlan('pro')" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition">
          Subir a Plan Pro ($1,199)
        </button>
      </div>
    </div>
  `;
}

function renderCurrentView() {
  const container = document.getElementById('main-view');
  if (!state.db) {
    container.innerHTML = '<div class="text-slate-400">Cargando NexGym Cloud MX...</div>';
    return;
  }

  switch (state.currentView) {
    case 'dashboard':
      container.innerHTML = renderDashboard();
      break;
    case 'pos':
      container.innerHTML = renderPOS();
      break;
    case 'members':
      container.innerHTML = renderMembers();
      break;
    case 'access':
      container.innerHTML = renderAccessControl();
      break;
    case 'cfdi':
      container.innerHTML = renderCFDI();
      break;
    case 'domiciliacion':
      container.innerHTML = renderDomiciliacion();
      break;
    case 'routines':
      container.innerHTML = renderRoutines();
      break;
    case 'boutique':
      container.innerHTML = renderBoutiqueMap();
      break;
    case 'whatsapp-ai':
      container.innerHTML = renderWhatsappAI();
      break;
    case 'saas-modules':
      container.innerHTML = renderSaaSModulesConfig();
      break;
    default:
      container.innerHTML = renderDashboard();
  }
}

/* ============================================================================
   1. DASHBOARD VIEW
============================================================================ */
function renderDashboard() {
  const db = state.db;
  const totalSalesToday = db.sales.reduce((acc, s) => acc + s.total, 0);
  const cashToday = db.sales.filter(s => s.paymentMethod === 'Efectivo').reduce((acc, s) => acc + s.total, 0);
  const cardToday = totalSalesToday - cashToday;
  const activeCount = db.members.filter(m => m.status === 'activo').length;
  const expiringCount = db.members.filter(m => m.status === 'por_vencer').length;
  const expiredCount = db.members.filter(m => m.status === 'vencido').length;
  const currentPlanObj = db.plansCatalog[db.saasConfig.currentPlan];

  return `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Top Hero Banner -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ${currentPlanObj.name} Activo
            </span>
            <span class="text-xs text-slate-400">RFC Emisor: <strong class="text-slate-200 mono">${db.saasConfig.rfcEmisor}</strong></span>
          </div>
          <h1 class="text-2xl font-extrabold text-white mt-1">Centro de Control Operativo — ${db.saasConfig.gymName}</h1>
          <p class="text-xs text-slate-400 mt-0.5">Reemplazo moderno de BDKGYM en la nube: Punto de venta antifraude, torniquetes offline-first y autofacturación CFDI 4.0.</p>
        </div>
        <div class="flex items-center gap-2.5">
          <button onclick="window.app.navigate('pos')" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <i class="fa-solid fa-cash-register"></i> Cobrar en Recepción (POS)
          </button>
          <button onclick="window.app.navigate('access')" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center gap-2">
            <i class="fa-solid fa-door-open text-emerald-400"></i> Abrir Kiosco Torniquete
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Ventas del Día (Recepción + Online)</span>
            <i class="fa-solid fa-sack-dollar text-emerald-400 text-base"></i>
          </div>
          <div class="text-2xl font-extrabold text-white mt-2">${formatMXN(totalSalesToday)}</div>
          <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Efectivo: <strong class="text-emerald-400">${formatMXN(cashToday)}</strong></span>
            <span>Tarjeta/Stripe: <strong class="text-sky-400">${formatMXN(cardToday)}</strong></span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Padrón de Socios</span>
            <i class="fa-solid fa-users text-sky-400 text-base"></i>
          </div>
          <div class="text-2xl font-extrabold text-white mt-2">${db.members.length} <span class="text-xs font-normal text-slate-400">registrados</span></div>
          <div class="mt-2 flex items-center gap-2 text-[11px]">
            <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">${activeCount} Activos</span>
            <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">${expiringCount} Por vencer</span>
            <span class="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold">${expiredCount} Vencidos</span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Facturación CFDI 4.0 (SAT)</span>
            <i class="fa-solid fa-file-invoice text-amber-400 text-base"></i>
          </div>
          <div class="text-2xl font-extrabold text-white mt-2">${db.invoices.length} <span class="text-xs font-normal text-slate-400">CFDIs timbrados</span></div>
          <div class="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Clave SAT: <strong class="mono text-slate-200">93141500</strong></span>
            <button onclick="window.app.navigate('cfdi')" class="text-emerald-400 hover:underline font-medium">Portal Autofactura →</button>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Accesos & Torniquete Hoy</span>
            <i class="fa-solid fa-fingerprint text-purple-400 text-base"></i>
          </div>
          <div class="text-2xl font-extrabold text-white mt-2">${db.accessLogs.length} <span class="text-xs font-normal text-slate-400">eventos hoy</span></div>
          <div class="mt-2 text-[11px] text-emerald-400 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-check"></i>
            <span>ZKTeco / QR respondiendo en 0.3s</span>
          </div>
        </div>
      </div>

      <!-- Two Columns: Expiring Members (WhatsApp Recovery) & Latest Access Logs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Socios por vencer / vencidos para recuperar por WhatsApp -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-bold text-white text-base flex items-center gap-2">
                <i class="fa-brands fa-whatsapp text-emerald-400 text-lg"></i>
                Recuperación de Cartera por WhatsApp
              </h2>
              <p class="text-xs text-slate-400">Envía recordatorios de pago con link de Stripe/SPEI en 1 clic.</p>
            </div>
            <button onclick="window.app.navigate('members')" class="text-xs text-emerald-400 hover:underline font-semibold">Ver todos →</button>
          </div>

          <div class="space-y-3">
            ${db.members.filter(m => m.status !== 'activo').map(m => `
              <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-white">${m.name}</span>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${m.status === 'por_vencer' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}">
                      ${m.status === 'por_vencer' ? `Vence en ${m.daysRemaining} días` : `Vencido hace ${Math.abs(m.daysRemaining)} días`}
                    </span>
                  </div>
                  <div class="text-xs text-slate-400 mt-0.5">${m.membershipType} • ${formatMXN(m.price)}</div>
                </div>
                <div class="flex items-center gap-2">
                  <button onclick="window.app.sendWhatsAppReminder('${m.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition">
                    <i class="fa-brands fa-whatsapp"></i> Recordar Pago
                  </button>
                  <button onclick="window.app.quickRenewMember('${m.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition">
                    Cobrar en POS
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Bitácora en vivo del Torniquete -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-bold text-white text-base flex items-center gap-2">
                <i class="fa-solid fa-shield-halved text-sky-400"></i>
                Bitácora de Torniquete y Recepción en Vivo
              </h2>
              <p class="text-xs text-slate-400">Monitoreo de entradas por QR, huella digital y reconocimiento facial.</p>
            </div>
            <button onclick="window.app.navigate('access')" class="text-xs text-emerald-400 hover:underline font-semibold">Probar Lector →</button>
          </div>

          <div class="space-y-2.5">
            ${db.accessLogs.slice(0, 5).map(log => `
              <div class="p-3 rounded-xl bg-slate-950 border ${log.allowed ? 'border-slate-800' : 'border-rose-500/40 bg-rose-950/10'} flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center ${log.allowed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                    <i class="fa-solid ${log.allowed ? 'fa-door-open' : 'fa-ban'}"></i>
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-white">${log.memberName} <span class="text-xs font-normal text-slate-500 mono">(${log.memberId})</span></div>
                    <div class="text-[11px] text-slate-400">${log.note}</div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs font-semibold text-slate-300">${log.time}</div>
                  <div class="text-[10px] text-slate-500">${log.method}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   2. POS RECEPCIÓN & CORTE DE CAJA ANTIFRAUDE (ESTILO BDKGYM CLOUD)
============================================================================ */
function renderPOS() {
  const db = state.db;
  const cartTotal = state.posCart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const subtotal = (cartTotal / 1.16).toFixed(2);
  const iva = (cartTotal - subtotal).toFixed(2);

  const cashSales = db.sales.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
  const cardSales = db.sales.filter(s => s.paymentMethod !== 'Efectivo').reduce((sum, s) => sum + s.total, 0);
  const expenses = db.cashDrawer.cashExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expectedCashInDrawer = db.cashDrawer.initialFund + cashSales - expenses;

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-white">Punto de Venta (POS) y Corte de Caja Antifraude</h1>
          <p class="text-xs text-slate-400">Renueva membresías al instante, vende suplementos/visitas y genera tickets térmicos con QR de Autofacturación CFDI 4.0.</p>
        </div>
        <button onclick="window.app.openCashCutModal()" class="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition">
          <i class="fa-solid fa-vault"></i> Realizar Corte de Caja Ciego (Efectivo esperado: ${formatMXN(expectedCashInDrawer)})
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Catálogo de Membresías y Productos -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 class="font-bold text-white text-sm mb-3 uppercase tracking-wider text-slate-400">1. Selecciona Membresía o Producto de Recepción</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${db.posProducts.map(prod => `
                <button onclick="window.app.addToCart('${prod.id}')" class="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition flex items-center justify-between group">
                  <div>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${prod.category === 'Membresía' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'}">${prod.category}</span>
                    <div class="font-semibold text-sm text-white mt-1 group-hover:text-emerald-300">${prod.name}</div>
                    <div class="text-[11px] text-slate-500 mono">Clave SAT: ${prod.satKey} ${prod.durationDays ? `• +${prod.durationDays} días` : ''}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-base font-extrabold text-emerald-400">$${prod.price}</div>
                    <span class="text-[11px] text-slate-400"><i class="fa-solid fa-plus-circle"></i> Agregar</span>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Últimos Tickets Emitidos -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 class="font-bold text-white text-sm mb-3">Historial de Tickets en el Turno Actual</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th class="py-2">Ticket / Folio CFDI</th>
                    <th class="py-2">Socio / Cliente</th>
                    <th class="py-2">Concepto</th>
                    <th class="py-2">Método</th>
                    <th class="py-2">Total</th>
                    <th class="py-2">Estado SAT</th>
                    <th class="py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/70">
                  ${db.sales.map(s => `
                    <tr>
                      <td class="py-2.5 font-semibold text-white mono">${s.id}<div class="text-[10px] text-emerald-400">Folio QR: ${s.folioAutofactura}</div></td>
                      <td class="py-2.5 text-slate-200">${s.memberName}</td>
                      <td class="py-2.5 text-slate-400">${s.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                      <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">${s.paymentMethod}</span></td>
                      <td class="py-2.5 font-bold text-white">${formatMXN(s.total)}</td>
                      <td class="py-2.5">
                        ${s.invoiced
                          ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">Timbrado CFDI</span>`
                          : `<span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">Pendiente Autofactura</span>`
                        }
                      </td>
                      <td class="py-2.5 text-right space-x-1">
                        <button onclick="window.app.showPrintableTicket('${s.id}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200" title="Imprimir Ticket 80mm">
                          <i class="fa-solid fa-print"></i> Ticket
                        </button>
                        ${!s.invoiced ? `
                          <button onclick="window.app.quickTimbrarTicket('${s.folioAutofactura}')" class="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold">
                            Facturar
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Panel Derecho: Ticket en Curso -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between h-fit sticky top-4">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 class="font-bold text-white text-base"><i class="fa-solid fa-receipt text-emerald-400 mr-1.5"></i>Caja Registradora</h2>
              <button onclick="window.app.clearCart()" class="text-xs text-rose-400 hover:underline">Limpiar</button>
            </div>

            <div>
              <label class="block text-xs text-slate-400 mb-1">Asignar Venta / Renovación al Socio:</label>
              <select onchange="window.app.setPosMember(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <option value="PUBLICO" ${state.posSelectedMember === 'PUBLICO' ? 'selected' : ''}>Público en General (Visita / Cafetería)</option>
                ${db.members.map(m => `
                  <option value="${m.id}" ${state.posSelectedMember === m.id ? 'selected' : ''}>
                    ${m.id} — ${m.name} (${m.daysRemaining >= 0 ? `${m.daysRemaining}d vigentes` : 'VENCIDO'})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Items en el carrito -->
            <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
              ${state.posCart.length === 0 ? `
                <div class="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Haz clic en una membresía o producto de la izquierda para agregarlo a la cuenta.
                </div>
              ` : state.posCart.map((item, idx) => `
                <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div class="font-semibold text-white">${item.name}</div>
                    <div class="text-slate-400">$${item.price} x ${item.qty}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-emerald-400">$${item.price * item.qty}</span>
                    <button onclick="window.app.removeFromCart(${idx})" class="text-rose-400 hover:text-rose-300 px-1"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Método de Pago -->
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">Método de Pago en Recepción:</label>
              <div class="grid grid-cols-2 gap-2 text-xs">
                ${['Efectivo', 'Tarjeta Terminal', 'Transferencia SPEI', 'Domiciliación Stripe'].map(metodo => `
                  <button onclick="window.app.setPosPaymentMethod('${metodo}')" class="py-2 px-2.5 rounded-xl border font-semibold transition ${state.posPaymentMethod === metodo ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}">
                    ${metodo}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Desglose Fiscal SAT -->
            <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div class="flex justify-between text-slate-400"><span>Subtotal antes de impuestos:</span><span>$${subtotal} MXN</span></div>
              <div class="flex justify-between text-slate-400"><span>IVA Trasladado (16%):</span><span>$${iva} MXN</span></div>
              <div class="flex justify-between text-base font-extrabold text-white pt-1.5 border-t border-slate-800">
                <span>Total a Cobrar:</span>
                <span class="text-emerald-400">${formatMXN(cartTotal)}</span>
              </div>
            </div>

            <button onclick="window.app.checkoutPOS()" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              <i class="fa-solid fa-check-double"></i> Cobrar y Emitir Ticket con QR CFDI 4.0
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   3. GESTIÓN DE SOCIOS & RECORDATORIOS WHATSAPP
============================================================================ */
function renderMembers() {
  const db = state.db;
  const maxMembers = db.plansCatalog[db.saasConfig.currentPlan].maxMembers;

  const filtered = db.members.filter(m => {
    if (state.memberFilter !== 'todos' && m.status !== state.memberFilter) return false;
    if (state.memberSearch) {
      const q = state.memberSearch.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.rfc.toLowerCase().includes(q);
    }
    return true;
  });

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-white">Padrón de Socios, Biometría y Alertas WhatsApp</h1>
          <p class="text-xs text-slate-400">Capacidad de tu plan actual: <strong>${db.members.length} / ${maxMembers > 10000 ? 'Ilimitados' : maxMembers} socios</strong>. Incluye envío de credenciales QR y recordatorios de vencimiento.</p>
        </div>
        <button onclick="window.app.openNewMemberModal()" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <i class="fa-solid fa-user-plus"></i> Inscribir Nuevo Socio
        </button>
      </div>

      <!-- Filtros y Búsqueda -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          ${[
            { id: 'todos', label: 'Todos los Socios' },
            { id: 'activo', label: 'Vigentes' },
            { id: 'por_vencer', label: 'Por Vencer (≤5 días)' },
            { id: 'vencido', label: 'Vencidos' }
          ].map(f => `
            <button onclick="window.app.setMemberFilter('${f.id}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold transition ${state.memberFilter === f.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'}">
              ${f.label}
            </button>
          `).join('')}
        </div>
        <div class="relative w-full sm:w-72">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-500 text-xs"></i>
          <input type="text" value="${state.memberSearch}" oninput="window.app.setMemberSearch(this.value)" placeholder="Buscar por nombre, ID o RFC..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
        </div>
      </div>

      <!-- Tabla de Socios -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th class="p-3.5">Socio / Credencial</th>
                <th class="p-3.5">Membresía</th>
                <th class="p-3.5">Vigencia</th>
                <th class="p-3.5">Biometría / Acceso</th>
                <th class="p-3.5">Datos Fiscales (CFDI 4.0)</th>
                <th class="p-3.5">Cobro</th>
                <th class="p-3.5 text-right">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${filtered.map(m => `
                <tr class="hover:bg-slate-800/40 transition">
                  <td class="p-3.5">
                    <div class="font-bold text-white text-sm">${m.name}</div>
                    <div class="text-slate-400 mono text-[11px]">${m.id} • Tel: +${m.phone}</div>
                  </td>
                  <td class="p-3.5">
                    <div class="font-semibold text-slate-200">${m.membershipType}</div>
                    <div class="text-emerald-400 font-bold">${formatMXN(m.price)}</div>
                  </td>
                  <td class="p-3.5">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      m.status === 'activo' ? 'bg-emerald-500/15 text-emerald-400' :
                      m.status === 'por_vencer' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-rose-500/20 text-rose-400'
                    }">
                      ${m.daysRemaining >= 0 ? `${m.daysRemaining} días restantes` : `Vencido (${Math.abs(m.daysRemaining)}d)`}
                    </span>
                    <div class="text-[10px] text-slate-500 mt-1">Vence: ${m.expiresAt}</div>
                  </td>
                  <td class="p-3.5">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"><i class="fa-solid fa-qrcode mr-1"></i>QR</span>
                      ${m.biometricEnrolled ? `<span class="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20"><i class="fa-solid fa-fingerprint mr-1"></i>Huella</span>` : ''}
                      ${m.faceEnrolled ? `<span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"><i class="fa-solid fa-face-viewfinder mr-1"></i>Rostro</span>` : ''}
                    </div>
                  </td>
                  <td class="p-3.5">
                    <div class="mono font-semibold text-slate-200">${m.rfc}</div>
                    <div class="text-[10px] text-slate-400">CP ${m.cpFiscal} • ${m.regimenFiscal.slice(0, 22)}...</div>
                  </td>
                  <td class="p-3.5">
                    ${m.domiciliado
                      ? `<span class="text-emerald-400 font-semibold"><i class="fa-solid fa-repeat mr-1"></i>Domiciliado ••${m.cardLast4}</span>`
                      : `<span class="text-slate-400">${m.cardBrand}</span>`
                    }
                  </td>
                  <td class="p-3.5 text-right space-x-1">
                    <button onclick="window.app.sendWhatsAppReminder('${m.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold" title="Enviar WhatsApp con QR y Link de Pago">
                      <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </button>
                    <button onclick="window.app.simulateCheckIn('${m.id}', 'QR Recepción')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200" title="Probar Entrada en Torniquete">
                      <i class="fa-solid fa-door-open"></i> Check-In
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   4. KIOSCO DE CONTROL DE ACCESO (QR + TORNIQUETE HUELLA/ROSTRO + OFFLINE)
============================================================================ */
function renderAccessControl() {
  const db = state.db;
  const bioUnlocked = hasFeature('biometrics');
  const res = state.lastAccessResult;

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      ${renderModuleUpsellBanner(
        'biometrics',
        'Módulo Bridge para Torniquetes Físicos, Lector de Huella ZKTeco y Reconocimiento Facial Hikvision',
        'En el Plan Básico ($599) tienes acceso por Código QR ilimitado. Activa este módulo (+$299/mes) o sube al Plan Pro ($1,199) para abrir torniquetes por puerto COM/TCP con huella y rostro.'
      )}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Simulador Interactivo de Torniquete y Lector -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-extrabold text-white">Kiosco Check-In & Torniquete</h1>
              <p class="text-xs text-slate-400">Simula la lectura de un socio por QR, Huella ZKTeco o Terminal Facial.</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold ${db.saasConfig.offlineModeSimulated ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/15 text-emerald-400'}">
              ${db.saasConfig.offlineModeSimulated ? '⚡ Caché Offline SQLite' : '☁️ Sincronizado en Nube'}
            </span>
          </div>

          <div class="space-y-3">
            <label class="block text-xs font-semibold text-slate-300">Selecciona un socio para escanear en la entrada:</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${db.members.map(m => `
                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div class="font-bold text-xs text-white">${m.name}</div>
                    <div class="text-[11px] ${m.daysRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                      ${m.id} • ${m.daysRemaining >= 0 ? `${m.daysRemaining} días vigentes` : `Vencido (${Math.abs(m.daysRemaining)}d)`}
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button onclick="window.app.simulateCheckIn('${m.id}', 'Escáner QR')" class="px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold" title="Escanear QR">
                      <i class="fa-solid fa-qrcode"></i> QR
                    </button>
                    <button onclick="window.app.simulateBiometricCheckIn('${m.id}', 'Huella ZKTeco')" class="px-2 py-1.5 rounded-lg ${bioUnlocked ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300' : 'bg-slate-800 text-slate-500'} text-[11px] font-bold" title="Lector de Huella">
                      <i class="fa-solid fa-fingerprint"></i>
                    </button>
                    <button onclick="window.app.simulateBiometricCheckIn('${m.id}', 'Facial Hikvision')" class="px-2 py-1.5 rounded-lg ${bioUnlocked ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300' : 'bg-slate-800 text-slate-500'} text-[11px] font-bold" title="Cámara Facial">
                      <i class="fa-solid fa-face-viewfinder"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Semáforo Gigante del Monitor de Entrada -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          ${!res ? `
            <div class="my-auto text-center py-12 space-y-3">
              <div class="w-20 h-20 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-3xl text-emerald-400">
                <i class="fa-solid fa-qrcode"></i>
              </div>
              <h2 class="text-lg font-bold text-white">Monitor de Torniquete Listo</h2>
              <p class="text-xs text-slate-400 max-w-sm mx-auto">Haz clic en el botón <strong>QR</strong>, <strong>Huella</strong> o <strong>Rostro</strong> de cualquier socio a la izquierda para ver cómo responde el torniquete en tiempo real.</p>
            </div>
          ` : `
            <div class="my-auto p-6 rounded-2xl border-2 text-center space-y-4 ${
              res.allowed
                ? (res.member.daysRemaining <= 5 ? 'bg-amber-950/30 border-amber-500' : 'bg-emerald-950/30 border-emerald-500')
                : 'bg-rose-950/40 border-rose-500'
            }">
              <div class="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl ${
                res.allowed
                  ? (res.member.daysRemaining <= 5 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950')
                  : 'bg-rose-500 text-white'
              }">
                <i class="fa-solid ${res.allowed ? 'fa-lock-open' : 'fa-ban'}"></i>
              </div>

              <div>
                <span class="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
                  res.allowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }">
                  ${res.allowed ? '✓ PULSO ENVIADO A TORNIQUETE — PASE APROBADO' : '✕ TORNIQUETE BLOQUEADO — MEMBRESÍA VENCIDA'}
                </span>
                <h2 class="text-2xl font-black text-white mt-3">${res.member ? res.member.name : 'Usuario Desconocido'}</h2>
                <p class="text-sm text-slate-300 mt-1">${res.member ? res.member.membershipType : ''}</p>
              </div>

              <div class="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200">
                ${res.log.note}
              </div>

              ${!res.allowed && res.member ? `
                <button onclick="window.app.quickRenewMember('${res.member.id}')" class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition">
                  Cobrar Renovación en Recepción (${formatMXN(res.member.price)}) →
                </button>
              ` : ''}
            </div>
          `}

          <div class="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Hardware: <strong>${db.saasConfig.turnstileHardware.brand}</strong></span>
            <span class="mono">${db.saasConfig.turnstileHardware.port}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   5. FACTURACIÓN ELECTRÓNICA CFDI 4.0 (SAT MÉXICO) & PORTAL AUTOFACTURA
============================================================================ */
function renderCFDI() {
  const db = state.db;
  const unInvoicedSales = db.sales.filter(s => !s.invoiced);

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-extrabold text-white">Módulo de Facturación CFDI 4.0 (SAT)</h1>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Incluido desde Plan Básico ($599)</span>
          </div>
          <p class="text-xs text-slate-400">Emisor: <strong>${db.saasConfig.gymName} (${db.saasConfig.rfcEmisor})</strong> • Clave SAT por defecto: <code class="text-emerald-400">93141500</code> (Servicios de acondicionamiento físico).</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Portal de Autofacturación en 1 Clic para el Socio -->
        <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
              <i class="fa-solid fa-qrcode"></i>
            </div>
            <div>
              <h2 class="font-bold text-white text-base">Portal de Autofacturación 24/7</h2>
              <p class="text-[11px] text-slate-400">Lo que ve el socio al escanear el QR de su ticket.</p>
            </div>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Folio de Autofactura (impreso en ticket):</label>
              <select id="cfdi-folio" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white mono">
                ${unInvoicedSales.length > 0 ? unInvoicedSales.map(s => `
                  <option value="${s.folioAutofactura}">${s.folioAutofactura} — ${s.memberName} ($${s.total} MXN)</option>
                `).join('') : `<option value="AF-8902-MX">Todos los tickets de hoy ya están timbrados (Crea una venta en POS)</option>`}
              </select>
            </div>

            <div>
              <label class="block text-slate-300 font-medium mb-1">RFC del Socio Receptor:</label>
              <input id="cfdi-rfc" type="text" value="GATV950821M42" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase mono" />
            </div>

            <div>
              <label class="block text-slate-300 font-medium mb-1">Nombre o Razón Social (Sin régimen societario):</label>
              <input id="cfdi-nombre" type="text" value="VALERIA GARZA TREVINO" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-slate-300 font-medium mb-1">Código Postal Fiscal:</label>
                <input id="cfdi-cp" type="text" value="11560" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white mono" />
              </div>
              <div>
                <label class="block text-slate-300 font-medium mb-1">Régimen Fiscal SAT:</label>
                <select id="cfdi-regimen" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-white">
                  <option value="605 - Sueldos y Salarios">605 - Sueldos y Salarios</option>
                  <option value="612 - Personas Físicas Act. Emp.">612 - Act. Empresarial</option>
                  <option value="626 - RESICO">626 - RESICO</option>
                  <option value="601 - General Personas Morales">601 - Personas Morales</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-slate-300 font-medium mb-1">Uso de CFDI 4.0:</label>
              <select id="cfdi-uso" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white">
                <option value="G03 - Gastos en general">G03 - Gastos en general</option>
                <option value="D01 - Honorarios médicos y gastos hospitalarios">D01 - Honorarios médicos / Rehabilitación</option>
                <option value="S01 - Sin efectos fiscales">S01 - Sin efectos fiscales</option>
              </select>
            </div>

            <button onclick="window.app.timbrarDesdeFormulario()" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              <i class="fa-solid fa-stamp"></i> Validar con SAT y Timbrar CFDI 4.0 Ahora
            </button>
          </div>
        </div>

        <!-- Bóveda de CFDIs Emitidos -->
        <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-white text-base">Bóveda Fiscal de CFDIs 4.0 Timbrados</h2>
            <span class="text-xs text-slate-400">Conectado vía API PAC Autorizado (Facturapi / Facturama)</span>
          </div>

          <div class="space-y-3">
            ${db.invoices.map(inv => `
              <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">CFDI 4.0 VIGENTE</span>
                    <span class="font-bold text-white text-sm">${inv.serieFolio} — ${inv.nombreReceptor}</span>
                  </div>
                  <div class="text-xs text-slate-400 mono">
                    RFC: <strong class="text-slate-200">${inv.rfcReceptor}</strong> • CP: ${inv.cpReceptor} • Régimen: ${inv.regimenReceptor} • Uso: ${inv.usoCfdi}
                  </div>
                  <div class="text-[11px] text-slate-500 mono">UUID Fiscal: ${inv.uuid}</div>
                </div>
                <div class="text-right space-y-1.5">
                  <div class="text-base font-extrabold text-emerald-400">${formatMXN(inv.total)}</div>
                  <div class="flex items-center gap-1.5 justify-end">
                    <button onclick="window.app.previewCfdiXml('${inv.uuid}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200">
                      <i class="fa-solid fa-file-code text-sky-400 mr-1"></i>XML / PDF
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   6. DOMICILIACIÓN AUTOMÁTICA (STRIPE / CONEKTA / MERCADOPAGO)
============================================================================ */
function renderDomiciliacion() {
  const db = state.db;
  const domiciledMembers = db.members.filter(m => m.domiciliado);

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      ${renderModuleUpsellBanner(
        'domiciliacion',
        'Módulo de Domiciliación Automática (Stripe México, Conekta, MercadoPago y SPEI)',
        'Deja de perseguir socios cada mes. Tokeniza sus tarjetas de crédito/débito y cobra automáticamente con reintentos inteligentes.'
      )}

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-white">Domiciliación Bancaria & Links de Pago</h1>
          <p class="text-xs text-slate-400">Integración directa con Stripe México, Conekta y Openpay sin comisiones ocultas de plataforma.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="text-xs text-slate-400">Ingreso Mensual Recurrente Asegurado</div>
          <div class="text-2xl font-extrabold text-emerald-400 mt-1">
            ${formatMXN(domiciledMembers.reduce((s, m) => s + m.price, 0))}
          </div>
          <div class="text-[11px] text-slate-500 mt-1">${domiciledMembers.length} tarjetas tokenizadas activas</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="text-xs text-slate-400">Pasarelas Conectadas (MXN)</div>
          <div class="text-base font-bold text-white mt-2 flex items-center gap-2">
            <span class="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs">Stripe MX</span>
            <span class="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 text-xs">Conekta</span>
            <span class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs">OXXO / SPEI</span>
          </div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="text-xs text-slate-400">Tasa de Éxito en Renovación</div>
          <div class="text-2xl font-extrabold text-white mt-1">96.4%</div>
          <div class="text-[11px] text-emerald-400 mt-1">Reintento automático + aviso WhatsApp</div>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 class="font-bold text-white text-base mb-4">Padrón de Tarjetas Tokenizadas y Próximos Cargos</h2>
        <div class="space-y-3">
          ${db.members.map(m => `
            <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="font-bold text-white text-sm">${m.name} <span class="text-xs text-slate-500 mono">(${m.id})</span></div>
                <div class="text-xs text-slate-400">${m.membershipType} • Próximo cargo: <strong>${m.expiresAt}</strong></div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs px-3 py-1 rounded-lg ${m.domiciliado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}">
                  ${m.domiciliado ? `<i class="fa-solid fa-credit-card mr-1"></i> ${m.cardBrand} •••• ${m.cardLast4}` : 'Pago manual en recepción'}
                </span>
                <span class="font-bold text-white text-sm">${formatMXN(m.price)}</span>
                <button onclick="window.app.sendWhatsAppReminder('${m.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  Enviar Link Stripe por WhatsApp
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   7. APP MÓVIL DEL SOCIO: RUTINAS & PROGRESO CORPORAL
============================================================================ */
function renderRoutines() {
  const db = state.db;
  const selectedMember = db.members.find(m => m.id === state.selectedRoutineMemberId) || db.members[0];
  const assignedRoutine = db.routines.find(r => r.id === selectedMember.routineId) || db.routines[0];

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      ${renderModuleUpsellBanner(
        'routinesApp',
        'Módulo de App Móvil del Socio: Rutinas de Entrenamiento, Videos y Progreso Corporal',
        'Fideliza a tus socios con una Web-App en su celular donde ven su código QR de entrada, su rutina del día y sus medidas de bioimpedancia.'
      )}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Panel del Entrenador / Asignación de Rutinas -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 class="text-xl font-extrabold text-white">Asignador de Rutinas y Plan Nutricional</h1>
                <p class="text-xs text-slate-400">Selecciona un socio para cambiar su rutina y ver en vivo cómo luce su App Móvil.</p>
              </div>
              <select onchange="window.app.selectRoutineMember(this.value)" class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold">
                ${db.members.map(m => `<option value="${m.id}" ${m.id === selectedMember.id ? 'selected' : ''}>Socio: ${m.name} (${m.id})</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${db.routines.map(rut => `
                <div onclick="window.app.assignRoutine('${selectedMember.id}', '${rut.id}')" class="cursor-pointer p-4 rounded-xl border transition ${assignedRoutine.id === rut.id ? 'bg-emerald-950/30 border-emerald-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">${rut.goal}</span>
                    ${assignedRoutine.id === rut.id ? '<span class="text-xs font-bold text-emerald-400"><i class="fa-solid fa-circle-check"></i> Asignada</span>' : '<span class="text-xs text-slate-500">Asignar</span>'}
                  </div>
                  <div class="font-bold text-white text-sm mt-2">${rut.name}</div>
                  <div class="text-xs text-slate-400 mt-1">${rut.coach} • Meta: ${rut.kcalTarget} kcal (${rut.proteinGrams}g proteína)</div>
                </div>
              `).join('')}
            </div>

            <!-- Detalle de Ejercicios -->
            <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div class="font-bold text-white text-sm">${assignedRoutine.name} — Desglose de Series</div>
              ${assignedRoutine.days.map(d => `
                <div class="space-y-2">
                  <div class="text-xs font-bold text-emerald-400">${d.dayName}</div>
                  <div class="divide-y divide-slate-800/70">
                    ${d.exercises.map(ex => `
                      <div class="py-2 flex items-center justify-between text-xs">
                        <span class="font-medium text-slate-200"><i class="fa-solid fa-circle-play text-emerald-400 mr-1.5"></i>${ex.name}</span>
                        <span class="text-slate-400 mono">${ex.sets} × ${ex.reps} (${ex.rest}) • <strong class="text-amber-300">${ex.rpe}</strong></span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Vista Previa Interactiva del Celular del Socio -->
        <div class="bg-slate-900 border-4 border-slate-800 rounded-[36px] p-5 max-w-xs mx-auto w-full shadow-2xl space-y-4">
          <div class="w-16 h-1.5 bg-slate-700 rounded-full mx-auto"></div>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] text-emerald-400 font-bold uppercase">${db.saasConfig.gymName}</div>
              <div class="text-sm font-extrabold text-white">Hola, ${selectedMember.name.split(' ')[0]} 👋</div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">${selectedMember.daysRemaining}d vigentes</span>
          </div>

          <!-- QR Pass en el Celular -->
          <div class="p-4 rounded-2xl bg-white text-slate-950 text-center space-y-1.5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pase QR Torniquete</div>
            <div class="text-5xl py-1"><i class="fa-solid fa-qrcode"></i></div>
            <div class="font-extrabold text-xs mono">${selectedMember.id}</div>
          </div>

          <!-- Corporal Metrics -->
          <div class="grid grid-cols-2 gap-2 text-center">
            <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div class="text-[10px] text-slate-400">Peso Actual</div>
              <div class="text-sm font-extrabold text-white">${selectedMember.weightKg} kg</div>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div class="text-[10px] text-slate-400">% Grasa (InBody)</div>
              <div class="text-sm font-extrabold text-emerald-400">${selectedMember.bodyFatPct}%</div>
            </div>
          </div>

          <!-- Rutina en el celular -->
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div class="text-[11px] font-bold text-emerald-400">Tu Rutina de Hoy:</div>
            <div class="text-xs font-semibold text-white">${assignedRoutine.name}</div>
            <div class="text-[11px] text-slate-400">${assignedRoutine.days[0].exercises.slice(0, 3).map(e => `• ${e.name}`).join('<br>')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   8. MAPA INTERACTIVO BOUTIQUE (PILATES REFORMERS & INDOOR CYCLING BICIS)
============================================================================ */
function renderBoutiqueMap() {
  const db = state.db;
  const cls = db.boutiqueClasses.find(c => c.id === state.selectedBoutiqueClassId) || db.boutiqueClasses[0];
  const availableCount = cls.spots.filter(s => s.status === 'available').length;
  const occupiedCount = cls.spots.filter(s => s.status === 'occupied').length;

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      ${renderModuleUpsellBanner(
        'boutiqueMap',
        'Módulo de Reserva de Lugares en Mapa Interactivo (Pilates Reformers, Bicis de Cycling, Box)',
        'Compite contra Buq y Fitco a la mitad de precio: permite que tus clientas elijan exactamente su bici o cama de Pilates desde el celular.'
      )}

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-white">Mapa Interactivo de Salón Boutique</h1>
          <p class="text-xs text-slate-400">Haz clic en cualquier cama Reformer o bicicleta disponible para reservar o liberar el lugar en tiempo real.</p>
        </div>
        <div class="flex items-center gap-2">
          ${db.boutiqueClasses.map(c => `
            <button onclick="window.app.selectBoutiqueClass('${c.id}')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${cls.id === c.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'}">
              ${c.name}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div class="text-lg font-bold text-white">${cls.name}</div>
            <div class="text-xs text-slate-400">Coach: <strong>${cls.instructor}</strong> • ${cls.room}</div>
          </div>
          <div class="flex items-center gap-4 text-xs">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500 inline-block"></span> Libres (${availableCount})</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-sky-500/30 border border-sky-500 inline-block"></span> Reservados (${occupiedCount})</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-slate-800 border border-slate-600 inline-block"></span> Mantenimiento</span>
          </div>
        </div>

        <!-- Tarima del Coach -->
        <div class="w-64 mx-auto py-2 rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-center text-xs font-bold uppercase tracking-widest text-emerald-300 border border-slate-600">
          🎤 Tarima Instructor (${cls.instructor})
        </div>

        <!-- Grid de Lugares (Camas Reformer o Bicis) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
          ${cls.spots.map(spot => `
            <button onclick="window.app.toggleBoutiqueSpot('${cls.id}', ${spot.number})" class="p-4 rounded-2xl border text-left transition ${
              spot.status === 'available'
                ? 'bg-emerald-950/20 border-emerald-500/50 hover:bg-emerald-500/20'
                : spot.status === 'occupied'
                ? 'bg-sky-950/30 border-sky-500/50 hover:bg-sky-900/30'
                : 'bg-slate-950 border-slate-800 opacity-50 cursor-not-allowed'
            }">
              <div class="flex items-center justify-between">
                <span class="font-extrabold text-sm text-white">${cls.spotPrefix} #${spot.number}</span>
                <i class="fa-solid ${cls.id === 'CLS-PILATES' ? 'fa-bed' : 'fa-bicycle'} ${spot.status === 'available' ? 'text-emerald-400' : 'text-sky-400'}"></i>
              </div>
              <div class="mt-2 text-xs font-medium ${spot.status === 'available' ? 'text-emerald-300' : 'text-sky-200'}">
                ${spot.status === 'available' ? 'Disponible (Clic para reservar)' : spot.memberName}
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   9. AGENTE RECEPCIONISTA IA EN WHATSAPP 24/7
============================================================================ */
function renderWhatsappAI() {
  return `
    <div class="max-w-5xl mx-auto space-y-6">
      ${renderModuleUpsellBanner(
        'whatsappAi',
        'Módulo de Recepcionista con Inteligencia Artificial en WhatsApp 24/7',
        'Responde precios, horarios, envía links de pago de Stripe/SPEI, agenda clases muestra y timbra facturas CFDI 4.0 por WhatsApp automáticamente.'
      )}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="space-y-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h1 class="text-lg font-extrabold text-white flex items-center gap-2">
              <i class="fa-brands fa-whatsapp text-emerald-400 text-xl"></i> Agente IA "Valentina"
            </h1>
            <p class="text-xs text-slate-400">Entrenada con los precios, horarios, políticas y catálogo de tu gimnasio en México.</p>
            <div class="space-y-2 pt-2 text-xs">
              <div class="font-semibold text-slate-300">Prueba preguntarle como cliente:</div>
              <button onclick="window.app.sendAiQuickPrompt('Quiero facturar mi ticket AF-8902-MX con RFC GATV950821M42')" class="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-300 transition">
                🧾 "Quiero facturar mi ticket AF-8902-MX..."
              </button>
              <button onclick="window.app.sendAiQuickPrompt('Me interesa reservar Pilates Reformer mañana a las 9am')" class="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-300 transition">
                🧘‍♀️ "Quiero reservar Pilates Reformer a las 9am"
              </button>
              <button onclick="window.app.sendAiQuickPrompt('Mándame link para pagar por transferencia SPEI u OXXO')" class="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 transition">
                💳 "Mándame link para pagar por SPEI u OXXO"
              </button>
            </div>
          </div>
        </div>

        <!-- Simulador de Conversación de WhatsApp -->
        <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[520px]">
          <div class="bg-emerald-900/40 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <i class="fa-brands fa-whatsapp text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm text-white">Valentina IA — ${state.db.saasConfig.gymName}</div>
                <div class="text-[11px] text-emerald-400">En línea • Conectada a POS, Stripe y Facturapi CFDI 4.0</div>
              </div>
            </div>
          </div>

          <div id="ai-chat-box" class="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60">
            ${state.aiMessages.map(m => `
              <div class="flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-md rounded-2xl px-4 py-2.5 text-xs whitespace-pre-line ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                }">
                  <div>${m.text}</div>
                  <div class="text-[10px] opacity-60 text-right mt-1">${m.time}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <form onsubmit="window.app.handleAiSubmit(event)" class="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input id="ai-input" type="text" placeholder="Escribe un mensaje como si fueras un socio por WhatsApp..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
            <button type="submit" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs">
              Enviar <i class="fa-solid fa-paper-plane ml-1"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   10. CONFIGURADOR COMERCIAL DEL SAAS: PLANES Y MÓDULOS ADD-ON (PARA VENDER)
============================================================================ */
function renderSaaSModulesConfig() {
  const db = state.db;
  const currentPlanId = db.saasConfig.currentPlan;
  const currentPlanObj = db.plansCatalog[currentPlanId];
  const totalMonthly = calculateMonthlySaaSTotal();

  return `
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">Panel Comercial para Vender tu SaaS</span>
          <h1 class="text-2xl font-extrabold text-white mt-1">Configurador de Planes ("El Punto Dulce") y Módulos Add-On</h1>
          <p class="text-xs text-slate-300 mt-0.5">Entra con el Plan Básico de $599 MXN/mes con facturación CFDI 4.0 para robarle clientes a BDKGYM y GoGym, y véndeles módulos adicionales conforme crezcan.</p>
        </div>
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
          <div class="text-xs text-slate-400">Cotización Mensual del Gimnasio Actual:</div>
          <div class="text-3xl font-black text-emerald-400">${formatMXN(totalMonthly)}<span class="text-xs font-normal text-slate-400">/mes</span></div>
          <div class="text-[11px] text-slate-500">Sin costos forzosos de instalación ($0 Setup)</div>
        </div>
      </div>

      <!-- Los 3 Planes Principales ("Sweet Spot") -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        ${['basico', 'pro', 'boutique'].map(planKey => {
          const p = db.plansCatalog[planKey];
          const isSelected = currentPlanId === planKey;
          return `
            <div class="p-6 rounded-2xl border-2 flex flex-col justify-between transition ${isSelected ? 'bg-emerald-950/20 border-emerald-500 shadow-xl shadow-emerald-500/10' : 'bg-slate-900 border-slate-800'}">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-extrabold text-lg text-white">${p.name}</span>
                  ${isSelected ? '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950">Plan Activo</span>' : ''}
                </div>
                <div class="text-3xl font-black text-white">$${p.price.toLocaleString('es-MX')} <span class="text-xs font-normal text-slate-400">MXN / mes</span></div>
                <p class="text-xs text-slate-300 leading-relaxed">${p.description}</p>
                <div class="pt-2 space-y-1.5 text-xs text-slate-300">
                  ${planKey === 'basico' ? `
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Recepción POS + Corte de Caja Ciego</div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Hasta 150 socios activos</div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Acceso con Código QR</div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Recordatorios por WhatsApp</div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Link y Portal de Autofacturación CFDI 4.0</div>
                  ` : planKey === 'pro' ? `
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Todo el Plan Básico + <strong>Socios Ilimitados</strong></div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> <strong>Bridge Torniquetes, Huella ZKTeco y Rostro</strong></div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> <strong>Domiciliación con Stripe, Conekta y SPEI</strong></div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> <strong>App Web/Móvil con Rutinas y Nutrición</strong></div>
                  ` : `
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> Todo el Plan Pro Incluido</div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> <strong>Mapa Interactivo de Lugares (Bicis / Reformers)</strong></div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> <strong>Recepcionista IA en WhatsApp 24/7</strong></div>
                    <div><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i> <strong>Multisucursal y Reportes Consolidados</strong></div>
                  `}
                </div>
              </div>
              <button onclick="window.app.switchPlan('${planKey}')" class="mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'}">
                ${isSelected ? '✓ Plan Seleccionado' : `Activar ${p.name}`}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Módulos Individuales (Upselling sobre el Plan Básico) -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 class="text-lg font-extrabold text-white">Módulos Individuales a la Carta (Upselling)</h2>
          <p class="text-xs text-slate-400">Si un cliente contrata el <strong>Plan Básico ($599/mes)</strong> y solo necesita agregar un módulo extra (por ejemplo, abrir su torniquete con huella o domiciliar tarjetas), actívaselo aquí:</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${Object.entries(ADDON_PRICES).map(([key, addon]) => {
            const includedByPlan = currentPlanObj.includedFeatures.includes(key);
            const activeAddon = Boolean(db.saasConfig.addons[key]);
            const enabled = includedByPlan || activeAddon;

            return `
              <div class="p-4 rounded-xl bg-slate-950 border ${enabled ? 'border-emerald-500/40' : 'border-slate-800'} flex flex-col justify-between gap-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="w-10 h-10 rounded-xl ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'} flex items-center justify-center shrink-0">
                    <i class="fa-solid ${addon.icon}"></i>
                  </div>
                  <div class="flex-1">
                    <div class="font-bold text-white text-xs">${addon.name}</div>
                    <div class="text-emerald-400 font-extrabold text-sm mt-0.5">+$${addon.price} MXN / mes</div>
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  ${includedByPlan ? `
                    <span class="text-[11px] text-emerald-400 font-semibold"><i class="fa-solid fa-check-circle mr-1"></i>Incluido en tu ${currentPlanObj.name}</span>
                  ` : `
                    <span class="text-[11px] ${activeAddon ? 'text-amber-300 font-semibold' : 'text-slate-500'}">
                      ${activeAddon ? 'Módulo Extra Activo' : 'Módulo Desactivado'}
                    </span>
                    <button onclick="window.app.toggleAddon('${key}', ${!activeAddon})" class="px-3 py-1 rounded-lg text-xs font-bold transition ${activeAddon ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500 text-slate-950'}">
                      ${activeAddon ? 'Quitar' : '+ Agregar Módulo'}
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ============================================================================
   ACTIONS & CONTROLLER METHODS
============================================================================ */
window.app = {
  openLandingScreen() {
    state.screenMode = 'landing';
    state.loginError = '';
    syncScreensVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  logout() {
    state.session = null;
    state.screenMode = 'landing';
    state.loginError = '';
    syncScreensVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openLoginScreen() {
    state.screenMode = 'login';
    state.loginError = '';
    syncScreensVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openSuperAdmin() {
    if (!state.session || state.session.role !== 'superadmin') return;
    state.screenMode = 'superadmin';
    syncScreensVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async submitLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    await this.quickLogin(email, password);
  },

  async quickLogin(email, password) {
    state.loginError = '';
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.ok) {
      state.loginError = data.error || 'Error al iniciar sesión';
      syncScreensVisibility();
      return;
    }
    state.session = data.session;
    if (data.session.role === 'superadmin') {
      state.screenMode = 'superadmin';
    } else {
      state.screenMode = 'gym';
      state.currentView = 'dashboard';
    }
    await fetchState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async impersonateTenant(tenantId) {
    await fetch('/api/superadmin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });
    state.screenMode = 'gym';
    state.currentView = 'dashboard';
    await fetchState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async updateTenantPlan(tenantId, plan) {
    await fetch('/api/superadmin/tenant-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, plan })
    });
    await fetchState();
  },

  async toggleTenantAddon(tenantId, addonKey, enable) {
    await fetch('/api/superadmin/tenant-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, addons: { [addonKey]: enable } })
    });
    await fetchState();
  },

  async toggleTenantStatus(tenantId, status) {
    await fetch('/api/superadmin/tenant-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, status })
    });
    await fetchState();
  },

  openNewTenantModal() {
    this.openModal(`
      <div class="space-y-4">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg">
            <i class="fa-solid fa-dumbbell"></i>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-white">Dar de Alta Nuevo Gimnasio Cliente (Tenant)</h3>
            <p class="text-xs text-slate-400">Crea el acceso para un nuevo dueño de gimnasio que te contrató el SaaS.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="sm:col-span-2">
            <label class="block text-slate-300 mb-1">Nombre Comercial del Gimnasio:</label>
            <input id="nt-gym" type="text" placeholder="Ej.Spartan Fitness Puebla" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-slate-300 mb-1">Nombre del Dueño / Gerente:</label>
            <input id="nt-owner" type="text" placeholder="Ej. Ricardo Morales" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-slate-300 mb-1">Ciudad / Estado:</label>
            <input id="nt-city" type="text" value="Puebla, PUE" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-slate-300 mb-1">Correo de Acceso (Login del Dueño):</label>
            <input id="nt-email" type="email" value="dueno@spartanpuebla.mx" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white mono" />
          </div>
          <div>
            <label class="block text-slate-300 mb-1">Contraseña Asignada:</label>
            <input id="nt-pass" type="text" value="gym123" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white mono" />
          </div>
          <div>
            <label class="block text-slate-300 mb-1">RFC Emisor (Para Timbrar CFDI 4.0):</label>
            <input id="nt-rfc" type="text" value="SFP2406109A2" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase mono" />
          </div>
          <div>
            <label class="block text-slate-300 mb-1">Plan Contratado:</label>
            <select id="nt-plan" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold">
              <option value="basico">Plan Básico ($599 MXN/mes)</option>
              <option value="pro">Plan Pro ($1,199 MXN/mes)</option>
              <option value="boutique">Plan Boutique / Cadenas ($2,499 MXN/mes)</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button onclick="window.app.submitNewTenant()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs">Crear Gimnasio y Activar Licencia</button>
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cancelar</button>
        </div>
      </div>
    `);
  },

  async submitNewTenant() {
    const gymName = document.getElementById('nt-gym').value || 'Spartan Fitness Puebla';
    const ownerName = document.getElementById('nt-owner').value || 'Ricardo Morales';
    const city = document.getElementById('nt-city').value || 'Puebla, PUE';
    const email = document.getElementById('nt-email').value || 'dueno@spartanpuebla.mx';
    const password = document.getElementById('nt-pass').value || 'gym123';
    const rfcEmisor = document.getElementById('nt-rfc').value || 'SFP2406109A2';
    const plan = document.getElementById('nt-plan').value || 'basico';

    await fetch('/api/superadmin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gymName, ownerName, city, email, password, rfcEmisor, plan })
    });
    this.closeModal();
    await fetchState();
  },

  navigate(view) {
    state.currentView = view;
    updateHeaderAndNav();
    renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async switchPlan(planId) {
    await fetch('/api/saas/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId })
    });
    await fetchState();
  },

  async toggleAddon(addonKey, enable) {
    await fetch('/api/saas/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addons: { [addonKey]: enable } })
    });
    await fetchState();
  },

  async toggleOfflineSimulation() {
    const next = !state.db.saasConfig.offlineModeSimulated;
    await fetch('/api/saas/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offlineModeSimulated: next })
    });
    await fetchState();
  },

  async changeBranch(branchId) {
    if (branchId !== 'suc-1' && !hasFeature('multiBranch')) {
      this.openModal(`
        <div class="space-y-4 text-center">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto">
            <i class="fa-solid fa-building-lock"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">Módulo Multisucursal Requerido</h3>
          <p class="text-xs text-slate-300">Para administrar varias sucursales y permitir que los socios entren a cualquier club de tu cadena, activa el módulo <strong>Multisucursal (+$499 MXN/mes)</strong> o sube al <strong>Plan Boutique / Cadenas ($2,499/mes)</strong>.</p>
          <div class="flex justify-center gap-2 pt-2">
            <button onclick="window.app.toggleAddon('multiBranch', true); window.app.closeModal();" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">Activar Módulo (+$499/mes)</button>
            <button onclick="window.app.closeModal(); window.app.render();" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cancelar</button>
          </div>
        </div>
      `);
      updateHeaderAndNav();
      return;
    }
    await fetch('/api/saas/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeBranchId: branchId })
    });
    await fetchState();
  },

  addToCart(prodId) {
    const prod = state.db.posProducts.find(p => p.id === prodId);
    if (!prod) return;
    const existing = state.posCart.find(i => i.id === prodId);
    if (existing) {
      existing.qty += 1;
    } else {
      state.posCart.push({ ...prod, qty: 1 });
    }
    renderCurrentView();
  },

  removeFromCart(idx) {
    state.posCart.splice(idx, 1);
    renderCurrentView();
  },

  clearCart() {
    state.posCart = [];
    renderCurrentView();
  },

  setPosMember(memberId) {
    state.posSelectedMember = memberId;
  },

  setPosPaymentMethod(method) {
    state.posPaymentMethod = method;
    renderCurrentView();
  },

  async checkoutPOS() {
    if (state.posCart.length === 0) {
      alert('Agrega al menos una membresía o producto a la cuenta.');
      return;
    }
    const total = state.posCart.reduce((acc, i) => acc + i.price * i.qty, 0);
    const res = await fetch('/api/pos/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: state.posSelectedMember,
        items: state.posCart,
        total,
        paymentMethod: state.posPaymentMethod
      })
    });
    const data = await res.json();
    state.posCart = [];
    await fetchState();
    if (data.sale) {
      this.showPrintableTicket(data.sale.id);
    }
  },

  showPrintableTicket(ticketId) {
    const sale = state.db.sales.find(s => s.id === ticketId);
    if (!sale) return;
    const cfg = state.db.saasConfig;

    this.openModal(`
      <div class="space-y-4">
        <div id="printable-ticket" class="bg-white text-slate-950 p-5 rounded-xl font-mono text-xs space-y-2 max-w-xs mx-auto shadow">
          <div class="text-center border-b border-dashed border-slate-400 pb-2">
            <div class="font-extrabold text-sm">${cfg.gymName}</div>
            <div>RFC: ${cfg.rfcEmisor}</div>
            <div>Régimen: ${cfg.regimenEmisor}</div>
            <div>Ticket: ${sale.id} • ${sale.timestamp}</div>
          </div>
          <div class="py-1">
            <div>Cliente: <strong>${sale.memberName}</strong></div>
            <div>Pago: ${sale.paymentMethod}</div>
          </div>
          <div class="border-t border-b border-dashed border-slate-400 py-2 space-y-1">
            ${sale.items.map(i => `
              <div class="flex justify-between">
                <span>${i.qty}x ${i.name}</span>
                <span>$${(i.price * i.qty).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="space-y-0.5 text-right">
            <div>Subtotal: $${sale.subtotal.toFixed(2)} MXN</div>
            <div>IVA (16%): $${sale.iva.toFixed(2)} MXN</div>
            <div class="font-extrabold text-sm">TOTAL: $${sale.total.toFixed(2)} MXN</div>
          </div>
          <div class="pt-3 border-t border-dashed border-slate-400 text-center space-y-1">
            <div class="font-bold">AUTOFACTURACIÓN CFDI 4.0</div>
            <div class="text-3xl py-1"><i class="fa-solid fa-qrcode"></i></div>
            <div>Folio de Autofactura:</div>
            <div class="font-extrabold text-sm bg-slate-200 py-1 rounded">${sale.folioAutofactura}</div>
            <div class="text-[10px]">Escanea el QR o ingresa este folio en nuestro portal para descargar tu XML y PDF al instante.</div>
          </div>
        </div>

        <div class="flex justify-center gap-2">
          <button onclick="window.print()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5">
            <i class="fa-solid fa-print"></i> Imprimir Ticket 80mm
          </button>
          <button onclick="window.app.closeModal(); window.app.quickTimbrarTicket('${sale.folioAutofactura}');" class="px-4 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold text-xs">
            Timbrar CFDI 4.0 Ahora
          </button>
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cerrar</button>
        </div>
      </div>
    `);
  },

  quickTimbrarTicket(folio) {
    this.navigate('cfdi');
    setTimeout(() => {
      const sel = document.getElementById('cfdi-folio');
      if (sel) sel.value = folio;
    }, 50);
  },

  openCashCutModal() {
    const db = state.db;
    const cashSales = db.sales.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.total, 0);
    const expenses = db.cashDrawer.cashExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expected = db.cashDrawer.initialFund + cashSales - expenses;

    this.openModal(`
      <div class="space-y-4">
        <h3 class="text-lg font-extrabold text-white"><i class="fa-solid fa-vault text-amber-400 mr-1.5"></i>Corte de Caja Ciego Antifraude</h3>
        <p class="text-xs text-slate-400">El recepcionista ingresa el efectivo físico contado en el cajón para cuadrar turno contra las ventas registradas.</p>
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
          <div class="flex justify-between"><span>Fondo inicial de caja:</span><strong>${formatMXN(db.cashDrawer.initialFund)}</strong></div>
          <div class="flex justify-between"><span>Ventas en Efectivo hoy:</span><strong class="text-emerald-400">+${formatMXN(cashSales)}</strong></div>
          <div class="flex justify-between"><span>Salidas / Gastos caja chica:</span><strong class="text-rose-400">-${formatMXN(expenses)}</strong></div>
          <div class="flex justify-between pt-1.5 border-t border-slate-800 text-sm font-bold text-white"><span>Efectivo Esperado:</span><span>${formatMXN(expected)}</span></div>
        </div>
        <div>
          <label class="block text-xs text-slate-300 mb-1">Efectivo físico contado en cajón (MXN):</label>
          <input id="cut-counted" type="number" value="${expected}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold" />
        </div>
        <div class="flex justify-end gap-2">
          <button onclick="window.app.submitCashCut()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Cerrar Turno y Guardar Corte</button>
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cancelar</button>
        </div>
      </div>
    `);
  },

  async submitCashCut() {
    const counted = Number(document.getElementById('cut-counted').value || 0);
    await fetch('/api/pos/corte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countedCash: counted, shift: 'Turno Actual' })
    });
    this.closeModal();
    await fetchState();
    alert('Corte de caja registrado correctamente sin faltantes.');
  },

  quickRenewMember(memberId) {
    const m = state.db.members.find(x => x.id === memberId);
    if (!m) return;
    state.posSelectedMember = m.id;
    state.posCart = [{
      id: 'PROD-RENEW',
      category: 'Membresía',
      name: m.membershipType,
      price: m.price,
      satKey: '93141500',
      durationDays: 30,
      qty: 1
    }];
    this.navigate('pos');
  },

  setMemberFilter(f) {
    state.memberFilter = f;
    renderCurrentView();
  },

  setMemberSearch(q) {
    state.memberSearch = q;
    renderCurrentView();
  },

  openNewMemberModal() {
    const maxMembers = state.db.plansCatalog[state.db.saasConfig.currentPlan].maxMembers;
    if (state.db.members.length >= maxMembers) {
      alert('Has alcanzado el límite de 150 socios del Plan Básico. Sube al Plan Pro ($1,199) para socios ilimitados.');
      return;
    }
    this.openModal(`
      <div class="space-y-4">
        <h3 class="text-lg font-extrabold text-white"><i class="fa-solid fa-user-plus text-emerald-400 mr-1.5"></i>Inscribir Nuevo Socio</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="sm:col-span-2">
            <label class="block text-slate-400 mb-1">Nombre completo:</label>
            <input id="nm-name" type="text" placeholder="Ej. Sofía Hernández Lara" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">WhatsApp (10 dígitos MX):</label>
            <input id="nm-phone" type="text" value="525511223344" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white mono" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">RFC (Para CFDI 4.0):</label>
            <input id="nm-rfc" type="text" value="HELS960512M11" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase mono" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Membresía:</label>
            <select id="nm-plan" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white">
              <option value="Mensualidad Pesas + Cardio|750">Mensualidad Pesas + Cardio ($750)</option>
              <option value="Paquete Boutique Pilates/Cycling|1650">Paquete Boutique ($1,650)</option>
              <option value="Mensualidad Estudiante|580">Mensualidad Estudiante ($580)</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Código Postal Fiscal:</label>
            <input id="nm-cp" type="text" value="06700" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white mono" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="window.app.submitNewMember()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Guardar Socio y Enrolar QR/Huella</button>
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cancelar</button>
        </div>
      </div>
    `);
  },

  async submitNewMember() {
    const name = document.getElementById('nm-name').value || 'Nuevo Socio';
    const phone = document.getElementById('nm-phone').value;
    const rfc = document.getElementById('nm-rfc').value;
    const cpFiscal = document.getElementById('nm-cp').value;
    const [membershipType, priceStr] = document.getElementById('nm-plan').value.split('|');

    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        rfc,
        cpFiscal,
        membershipType,
        price: Number(priceStr),
        daysRemaining: 30,
        biometricEnrolled: true,
        domiciliado: true
      })
    });
    this.closeModal();
    await fetchState();
  },

  sendWhatsAppReminder(memberId) {
    const m = state.db.members.find(x => x.id === memberId);
    if (!m) return;
    const msg = `Hola *${m.name}* 👋 Te escribimos de *${state.db.saasConfig.gymName}*.\n\n` +
      `📌 *Estado de tu membresía (${m.membershipType}):* ${m.daysRemaining >= 0 ? `Vence en ${m.daysRemaining} días (${m.expiresAt})` : `Venció hace ${Math.abs(m.daysRemaining)} días`}.\n` +
      `💳 *Renueva en 1 clic con tarjeta o SPEI:* https://pagos.nexgym.mx/${m.id}\n` +
      `🧾 *Autofacturación CFDI 4.0:* https://factura.nexgym.mx/${m.id}`;

    this.openModal(`
      <div class="space-y-4">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            <i class="fa-brands fa-whatsapp"></i>
          </div>
          <div>
            <h3 class="font-extrabold text-white text-base">Mensaje Automático de WhatsApp Listo</h3>
            <p class="text-xs text-slate-400">Destinatario: +${m.phone} (${m.name})</p>
          </div>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-200 whitespace-pre-line">${msg}</div>
        <div class="flex justify-end gap-2">
          <a href="https://wa.me/${m.phone}?text=${encodeURIComponent(msg)}" target="_blank" onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5">
            <i class="fa-brands fa-whatsapp"></i> Abrir en WhatsApp Web / API
          </a>
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cerrar</button>
        </div>
      </div>
    `);
  },

  async simulateCheckIn(memberId, method) {
    const res = await fetch('/api/access/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: memberId, method })
    });
    state.lastAccessResult = await res.json();
    state.currentView = 'access';
    await fetchState();
  },

  async simulateBiometricCheckIn(memberId, method) {
    if (!hasFeature('biometrics')) {
      this.openModal(`
        <div class="space-y-4 text-center">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto">
            <i class="fa-solid fa-fingerprint"></i>
          </div>
          <h3 class="text-lg font-extrabold text-white">Lector Biométrico / Torniquete Bloqueado</h3>
          <p class="text-xs text-slate-300">En el Plan Básico ($599/mes) tienes incluido el acceso por <strong>Código QR</strong>. Para conectar lectores de huella ZKTeco, terminales faciales Hikvision y relés de torniquete, activa este módulo por <strong>+$299 MXN/mes</strong> o cambia al Plan Pro ($1,199).</p>
          <div class="flex justify-center gap-2">
            <button onclick="window.app.toggleAddon('biometrics', true); window.app.closeModal();" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">Activar Huella/Torniquete (+$299/mes)</button>
            <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Usar Solo QR</button>
          </div>
        </div>
      `);
      return;
    }
    await this.simulateCheckIn(memberId, method);
  },

  async timbrarDesdeFormulario() {
    const folio = document.getElementById('cfdi-folio').value;
    const rfc = document.getElementById('cfdi-rfc').value;
    const razonSocial = document.getElementById('cfdi-nombre').value;
    const cpFiscal = document.getElementById('cfdi-cp').value;
    const regimenFiscal = document.getElementById('cfdi-regimen').value;
    const usoCfdi = document.getElementById('cfdi-uso').value;

    const res = await fetch('/api/cfdi/timbrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio, rfc, razonSocial, cpFiscal, regimenFiscal, usoCfdi })
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error || 'Error al timbrar CFDI');
      return;
    }
    await fetchState();
    this.previewCfdiXml(data.invoice.uuid);
  },

  previewCfdiXml(uuid) {
    const inv = state.db.invoices.find(i => i.uuid === uuid);
    if (!inv) return;
    const cfg = state.db.saasConfig;

    this.openModal(`
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">CFDI 4.0 TIMBRADO ANTE EL SAT</span>
            <h3 class="text-base font-extrabold text-white mt-1">Factura ${inv.serieFolio} — ${inv.nombreReceptor}</h3>
          </div>
          <div class="text-right">
            <div class="text-lg font-black text-emerald-400">${formatMXN(inv.total)}</div>
          </div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] mono space-y-1 text-slate-300 overflow-x-auto">
          <div>&lt;cfdi:Comprobante Version="4.0" Serie="A" Folio="${inv.serieFolio.split('-')[1]}" Fecha="${inv.fechaTimbrado}" Moneda="MXN" SubTotal="${inv.subtotal}" Total="${inv.total}" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="${cfg.codigoPostal}"&gt;</div>
          <div class="pl-3 text-emerald-400">&lt;cfdi:Emisor Rfc="${cfg.rfcEmisor}" Nombre="${cfg.gymName.toUpperCase()}" RegimenFiscal="601"/&gt;</div>
          <div class="pl-3 text-sky-400">&lt;cfdi:Receptor Rfc="${inv.rfcReceptor}" Nombre="${inv.nombreReceptor}" DomicilioFiscalReceptor="${inv.cpReceptor}" RegimenFiscalReceptor="${inv.regimenReceptor}" UsoCFDI="${inv.usoCfdi.slice(0, 3)}"/&gt;</div>
          <div class="pl-3 text-amber-300">&lt;cfdi:Concepto ClaveProdServ="${inv.claveProdServ}" Cantidad="1" ClaveUnidad="E48" Descripcion="SERVICIOS DE ACONDICIONAMIENTO FISICO Y MEMBRESIA GYM" ValorUnitario="${inv.subtotal}" Importe="${inv.subtotal}" ObjetoImp="02"/&gt;</div>
          <div class="pl-3 text-purple-300">&lt;tfd:TimbreFiscalDigital Version="1.1" UUID="${inv.uuid}" FechaTimbrado="${inv.fechaTimbrado}"/&gt;</div>
          <div>&lt;/cfdi:Comprobante&gt;</div>
        </div>
        <div class="flex justify-end gap-2">
          <button onclick="window.app.closeModal()" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Listo</button>
        </div>
      </div>
    `);
  },

  selectRoutineMember(memberId) {
    state.selectedRoutineMemberId = memberId;
    renderCurrentView();
  },

  async assignRoutine(memberId, routineId) {
    await fetch('/api/routines/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, routineId })
    });
    await fetchState();
  },

  selectBoutiqueClass(classId) {
    state.selectedBoutiqueClassId = classId;
    renderCurrentView();
  },

  async toggleBoutiqueSpot(classId, spotNumber) {
    await fetch('/api/boutique/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, spotNumber, memberName: 'Socio Reservado en App' })
    });
    await fetchState();
  },

  sendAiQuickPrompt(text) {
    const input = document.getElementById('ai-input');
    if (input) {
      input.value = text;
      this.handleAiSubmit(new Event('submit'));
    }
  },

  handleAiSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('ai-input');
    if (!input || !input.value.trim()) return;
    const userText = input.value.trim();
    input.value = '';

    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    state.aiMessages.push({ sender: 'user', time: now, text: userText });

    const lower = userText.toLowerCase();
    let reply = '';
    if (lower.includes('factur') || lower.includes('cfdi') || lower.includes('af-')) {
      reply = '¡Con gusto! 🧾 He validado tu folio *AF-8902-MX* y tus datos fiscales ante el SAT.\n\n✅ Tu factura *CFDI 4.0* (Clave SAT 93141500) ha sido timbrada con éxito y enviada en PDF + XML a tu correo y por este chat.';
    } else if (lower.includes('pilates') || lower.includes('bici') || lower.includes('reserv')) {
      reply = '🧘‍♀️ ¡Excelente! Para la clase de *Pilates Reformer Sculpt (09:00 AM)* con la Coach Sofía tenemos disponibles las camas *Reformer #2, #5, #7 y #8*.\n\n¿Cuál cama te aparto de una vez con tu membresía?';
    } else if (lower.includes('spei') || lower.includes('oxxo') || lower.includes('pag')) {
      reply = '💳 ¡Aquí tienes tu link de pago oficial en pesos mexicanos!\n\n👉 *Tarjeta / Apple Pay (Stripe):* https://buy.stripe.com/nexgym-mx\n👉 *CLABE SPEI (STP):* `646180157000001234`\n\nEn cuanto realices tu pago, tu código QR de acceso para el torniquete se activará automáticamente.';
    } else {
      reply = '¡Perfecto! 💪 Puedo ayudarte a inscribirte con domiciliación Stripe, apartar tu lugar en Pilates/Cycling, enviarte tu código QR para el torniquete o timbrar tu factura CFDI 4.0. ¿Qué prefieres hacer hoy?';
    }

    state.aiMessages.push({ sender: 'bot', time: now, text: reply });
    renderCurrentView();
    const box = document.getElementById('ai-chat-box');
    if (box) box.scrollTop = box.scrollHeight;
  },

  openModal(html) {
    const backdrop = document.getElementById('modal-backdrop');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    backdrop.classList.remove('hidden');
    backdrop.classList.add('flex');
  },

  closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.add('hidden');
    backdrop.classList.remove('flex');
  },

  render() {
    renderCurrentView();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  fetchState();
});
