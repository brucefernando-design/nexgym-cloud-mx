const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3847;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const INITIAL_DB = {
  saasConfig: {
    gymName: "Titanes Fitness & Studio MX",
    rfcEmisor: "TFS2305109A1",
    regimenEmisor: "601 - General de Ley Personas Morales",
    codigoPostal: "11560",
    currentPlan: "basico", // 'basico' ($599), 'pro' ($1199), 'boutique' ($2499)
    activeBranchId: "suc-1",
    offlineModeSimulated: false,
    turnstileHardware: {
      connected: true,
      brand: "ZKTeco TS2000 Pro + Hikvision Minmoe",
      port: "COM3 / 192.168.1.201",
      lastPing: "Hace 2 seg"
    },
    addons: {
      biometrics: false,     // +$299/mes (Incluido en Pro y Boutique)
      domiciliacion: false,  // +$249/mes (Incluido en Pro y Boutique)
      routinesApp: false,    // +$299/mes (Incluido en Pro y Boutique)
      boutiqueMap: false,    // +$399/mes (Incluido en Boutique)
      whatsappAi: false,     // +$499/mes (Incluido en Boutique)
      multiBranch: false     // +$499/mes (Incluido en Boutique)
    }
  },
  branches: [
    { id: "suc-1", name: "Sucursal Central (Roma Norte, CDMX)", address: "Av. Álvaro Obregón 185, CDMX", phone: "55 4123 8900", activeMembers: 118 },
    { id: "suc-2", name: "Sucursal Polanco (Estudio Boutique)", address: "Av. Pdte. Masaryk 310, CDMX", phone: "55 8901 2345", activeMembers: 84 },
    { id: "suc-3", name: "Sucursal Monterrey (San Pedro)", address: "Calz. del Valle 400, NL", phone: "81 2345 6789", activeMembers: 142 }
  ],
  plansCatalog: {
    basico: {
      id: "basico",
      name: "Plan Básico (BDK Cloud)",
      price: 599,
      maxMembers: 150,
      description: "Recepción/POS, corte de caja, hasta 150 socios, acceso QR, recordatorios WhatsApp y autofacturación CFDI 4.0.",
      includedFeatures: ["pos", "members", "qrAccess", "whatsappBasic", "cfdi"]
    },
    pro: {
      id: "pro",
      name: "Plan Pro (Full Gym)",
      price: 1199,
      maxMembers: 999999,
      description: "Socios ilimitados, conexión con torniquetes/huella/rostro, domiciliación Stripe/Conekta y App con rutinas.",
      includedFeatures: ["pos", "members", "qrAccess", "whatsappBasic", "cfdi", "biometrics", "domiciliacion", "routinesApp"]
    },
    boutique: {
      id: "boutique",
      name: "Plan Boutique / Cadenas",
      price: 2499,
      maxMembers: 999999,
      description: "Reserva de lugares en mapa interactivo (bicis/reformers), multisucursal y recepcionista IA en WhatsApp 24/7.",
      includedFeatures: ["pos", "members", "qrAccess", "whatsappBasic", "cfdi", "biometrics", "domiciliacion", "routinesApp", "boutiqueMap", "whatsappAi", "multiBranch"]
    }
  },
  members: [
    {
      id: "SOC-1001",
      name: "Alejandro Ramírez Soto",
      phone: "525512345678",
      email: "alejandro.ramirez@email.mx",
      rfc: "RASA920415H78",
      razonSocial: "ALEJANDRO RAMIREZ SOTO",
      regimenFiscal: "612 - Personas Físicas con Actividades Empresariales",
      cpFiscal: "06700",
      membershipType: "Mensualidad Pesas + Cardio",
      price: 750,
      status: "activo",
      expiresAt: "2026-11-24",
      daysRemaining: 24,
      biometricEnrolled: true,
      faceEnrolled: true,
      domiciliado: true,
      cardLast4: "4242",
      cardBrand: "Visa (Stripe MX)",
      routineId: "RUT-01",
      weightKg: 78.5,
      bodyFatPct: 16.2,
      branchId: "suc-1",
      lastCheckIn: "Hoy 07:45 AM"
    },
    {
      id: "SOC-1002",
      name: "Valeria Garza Treviño",
      phone: "525587654321",
      email: "valeria.garza@email.mx",
      rfc: "GATV950821M42",
      razonSocial: "VALERIA GARZA TREVINO",
      regimenFiscal: "605 - Sueldos y Salarios",
      cpFiscal: "11560",
      membershipType: "Paquete Boutique (Pilates + Cycling Ilimitado)",
      price: 1650,
      status: "activo",
      expiresAt: "2026-11-18",
      daysRemaining: 18,
      biometricEnrolled: true,
      faceEnrolled: true,
      domiciliado: true,
      cardLast4: "8819",
      cardBrand: "Mastercard (Conekta)",
      routineId: "RUT-02",
      weightKg: 58.0,
      bodyFatPct: 19.5,
      branchId: "suc-1",
      lastCheckIn: "Hoy 08:30 AM"
    },
    {
      id: "SOC-1003",
      name: "Carlos Eduardo Mendoza",
      phone: "525534567890",
      email: "carlos.mendoza@email.mx",
      rfc: "MECE881103K19",
      razonSocial: "CARLOS EDUARDO MENDOZA",
      regimenFiscal: "626 - Régimen Simplificado de Confianza (RESICO)",
      cpFiscal: "03100",
      membershipType: "Mensualidad Pesas + Cardio",
      price: 750,
      status: "por_vencer",
      expiresAt: "2026-11-03",
      daysRemaining: 3,
      biometricEnrolled: true,
      faceEnrolled: false,
      domiciliado: false,
      cardLast4: null,
      cardBrand: "Efectivo en Recepción",
      routineId: "RUT-01",
      weightKg: 84.2,
      bodyFatPct: 21.0,
      branchId: "suc-1",
      lastCheckIn: "Ayer 06:15 PM"
    },
    {
      id: "SOC-1004",
      name: "Fernanda López Villalobos",
      phone: "525599887766",
      email: "fer.lopez@email.mx",
      rfc: "LOVF980214P31",
      razonSocial: "FERNANDA LOPEZ VILLALOBOS",
      regimenFiscal: "605 - Sueldos y Salarios",
      cpFiscal: "06140",
      membershipType: "Mensualidad Estudiante",
      price: 580,
      status: "vencido",
      expiresAt: "2026-10-27",
      daysRemaining: -4,
      biometricEnrolled: true,
      faceEnrolled: false,
      domiciliado: false,
      cardLast4: null,
      cardBrand: "Efectivo en Recepción",
      routineId: "RUT-03",
      weightKg: 62.0,
      bodyFatPct: 22.4,
      branchId: "suc-1",
      lastCheckIn: "Hace 5 días"
    },
    {
      id: "SOC-1005",
      name: "Roberto Hernández Aguilar",
      phone: "525566778899",
      email: "roberto.hdz@email.mx",
      rfc: "HEAR850630L90",
      razonSocial: "ROBERTO HERNANDEZ AGUILAR",
      regimenFiscal: "612 - Personas Físicas con Actividades Empresariales",
      cpFiscal: "11520",
      membershipType: "Trimestral VIP (Todo Incluido)",
      price: 2100,
      status: "activo",
      expiresAt: "2027-01-15",
      daysRemaining: 76,
      biometricEnrolled: true,
      faceEnrolled: true,
      domiciliado: true,
      cardLast4: "5512",
      cardBrand: "Amex (Stripe MX)",
      routineId: "RUT-04",
      weightKg: 91.0,
      bodyFatPct: 14.8,
      branchId: "suc-1",
      lastCheckIn: "Hoy 09:10 AM"
    },
    {
      id: "SOC-1006",
      name: "Mariana Torres Domínguez",
      phone: "525544332211",
      email: "mariana.torres@email.mx",
      rfc: "TODM931210A55",
      razonSocial: "MARIANA TORRES DOMINGUEZ",
      regimenFiscal: "626 - Régimen Simplificado de Confianza (RESICO)",
      cpFiscal: "06760",
      membershipType: "Mensualidad Pesas + Cardio",
      price: 750,
      status: "por_vencer",
      expiresAt: "2026-11-02",
      daysRemaining: 2,
      biometricEnrolled: true,
      faceEnrolled: true,
      domiciliado: false,
      cardLast4: null,
      cardBrand: "Transferencia SPEI",
      routineId: "RUT-02",
      weightKg: 60.5,
      bodyFatPct: 20.1,
      branchId: "suc-1",
      lastCheckIn: "Hoy 10:05 AM"
    }
  ],
  posProducts: [
    { id: "PROD-01", category: "Membresía", name: "Mensualidad Pesas + Cardio", price: 750, satKey: "93141500", durationDays: 30 },
    { id: "PROD-02", category: "Membresía", name: "Mensualidad Estudiante", price: 580, satKey: "93141500", durationDays: 30 },
    { id: "PROD-03", category: "Membresía", name: "Paquete Boutique (Pilates + Cycling)", price: 1650, satKey: "93141500", durationDays: 30 },
    { id: "PROD-04", category: "Membresía", name: "Trimestral VIP Todo Incluido", price: 2100, satKey: "93141500", durationDays: 90 },
    { id: "PROD-05", category: "Membresía", name: "Visita Por Día (Day Pass)", price: 120, satKey: "93141500", durationDays: 1 },
    { id: "PROD-06", category: "Membresía", name: "Inscripción / Credencial QR + Huella", price: 150, satKey: "93141500", durationDays: 0 },
    { id: "PROD-07", category: "Cafetería", name: "Scoop Proteína Whey Isolate", price: 65, satKey: "50202306", durationDays: 0 },
    { id: "PROD-08", category: "Cafetería", name: "Pre-Entreno Energético Shot", price: 55, satKey: "50202306", durationDays: 0 },
    { id: "PROD-09", category: "Cafetería", name: "Agua Alcalina 1L / Electrolitos", price: 35, satKey: "50202301", durationDays: 0 },
    { id: "PROD-10", category: "Accesorios", name: "Toalla Microfibra Logo Gym", price: 180, satKey: "53102700", durationDays: 0 }
  ],
  sales: [
    {
      id: "TCK-8901",
      folioAutofactura: "AF-8901-MX",
      timestamp: "2026-10-31 07:42",
      memberId: "SOC-1001",
      memberName: "Alejandro Ramírez Soto",
      items: [{ name: "Mensualidad Pesas + Cardio", qty: 1, price: 750 }],
      subtotal: 646.55,
      iva: 103.45,
      total: 750,
      paymentMethod: "Domiciliación Stripe",
      invoiced: true,
      cfdiUuid: "5F8A2B10-9C4D-4E12-8A11-0092837465AB",
      cashier: "Recepción Matutino (Laura)"
    },
    {
      id: "TCK-8902",
      folioAutofactura: "AF-8902-MX",
      timestamp: "2026-10-31 08:35",
      memberId: "SOC-1002",
      memberName: "Valeria Garza Treviño",
      items: [
        { name: "Scoop Proteína Whey Isolate", qty: 1, price: 65 },
        { name: "Agua Alcalina 1L / Electrolitos", qty: 1, price: 35 }
      ],
      subtotal: 86.21,
      iva: 13.79,
      total: 100,
      paymentMethod: "Efectivo",
      invoiced: false,
      cfdiUuid: null,
      cashier: "Recepción Matutino (Laura)"
    },
    {
      id: "TCK-8903",
      folioAutofactura: "AF-8903-MX",
      timestamp: "2026-10-31 09:15",
      memberId: "SOC-1005",
      memberName: "Roberto Hernández Aguilar",
      items: [{ name: "Trimestral VIP Todo Incluido", qty: 1, price: 2100 }],
      subtotal: 1810.34,
      iva: 289.66,
      total: 2100,
      paymentMethod: "Tarjeta Terminal",
      invoiced: true,
      cfdiUuid: "7D9E1C44-3B2A-4F89-9E01-1122334455CD",
      cashier: "Recepción Matutino (Laura)"
    },
    {
      id: "TCK-8904",
      folioAutofactura: "AF-8904-MX",
      timestamp: "2026-10-31 10:20",
      memberId: "PUBLICO",
      memberName: "Público en General (Visita)",
      items: [{ name: "Visita Por Día (Day Pass)", qty: 1, price: 120 }],
      subtotal: 103.45,
      iva: 16.55,
      total: 120,
      paymentMethod: "Efectivo",
      invoiced: false,
      cfdiUuid: null,
      cashier: "Recepción Matutino (Laura)"
    }
  ],
  invoices: [
    {
      uuid: "5F8A2B10-9C4D-4E12-8A11-0092837465AB",
      serieFolio: "A-1042",
      ticketId: "TCK-8901",
      fechaTimbrado: "2026-10-31T07:43:10",
      rfcReceptor: "RASA920415H78",
      nombreReceptor: "ALEJANDRO RAMIREZ SOTO",
      regimenReceptor: "612",
      cpReceptor: "06700",
      usoCfdi: "G03 - Gastos en general",
      claveProdServ: "93141500",
      subtotal: 646.55,
      iva: 103.45,
      total: 750.00,
      pac: "Facturapi / SAT CFDI 4.0",
      status: "Vigente"
    },
    {
      uuid: "7D9E1C44-3B2A-4F89-9E01-1122334455CD",
      serieFolio: "A-1043",
      ticketId: "TCK-8903",
      fechaTimbrado: "2026-10-31T09:16:04",
      rfcReceptor: "HEAR850630L90",
      nombreReceptor: "ROBERTO HERNANDEZ AGUILAR",
      regimenReceptor: "612",
      cpReceptor: "11520",
      usoCfdi: "G03 - Gastos en general",
      claveProdServ: "93141500",
      subtotal: 1810.34,
      iva: 289.66,
      total: 2100.00,
      pac: "Facturapi / SAT CFDI 4.0",
      status: "Vigente"
    }
  ],
  accessLogs: [
    { id: "ACC-501", time: "10:05 AM", memberId: "SOC-1006", memberName: "Mariana Torres Domínguez", method: "Rostro Hikvision", allowed: true, note: "Vence en 2 días (Aviso en pantalla)" },
    { id: "ACC-500", time: "09:40 AM", memberId: "SOC-1004", memberName: "Fernanda López Villalobos", method: "Huella ZKTeco", allowed: false, note: "Membresía vencida hace 4 días - Torniquete bloqueado" },
    { id: "ACC-499", time: "09:10 AM", memberId: "SOC-1005", memberName: "Roberto Hernández Aguilar", method: "QR App Móvil", allowed: true, note: "Acceso VIP - Torniquete #1 Abierto" },
    { id: "ACC-498", time: "08:30 AM", memberId: "SOC-1002", memberName: "Valeria Garza Treviño", method: "QR App Móvil", allowed: true, note: "Reserva Pilates Cama #4 confirmada" },
    { id: "ACC-497", time: "07:45 AM", memberId: "SOC-1001", memberName: "Alejandro Ramírez Soto", method: "Huella ZKTeco", allowed: true, note: "Torniquete #1 Abierto (0.3s)" }
  ],
  routines: [
    {
      id: "RUT-01",
      name: "Hipertrofia Push / Pull / Legs (Intermedio)",
      coach: "Coach Diego Morales",
      goal: "Aumento de Masa Muscular",
      kcalTarget: 2650,
      proteinGrams: 175,
      days: [
        {
          dayName: "Día 1: Empuje (Pecho, Hombro, Tríceps)",
          exercises: [
            { name: "Press de Banca Plano con Barra", sets: "4 series", reps: "8-10 reps", rest: "90 seg", rpe: "RPE 8" },
            { name: "Press Inclinado con Mancuernas", sets: "3 series", reps: "10-12 reps", rest: "75 seg", rpe: "RPE 8" },
            { name: "Press Militar en Multipower", sets: "4 series", reps: "8-10 reps", rest: "90 seg", rpe: "RPE 8" },
            { name: "Elevaciones Laterales con Polea", sets: "4 series", reps: "15 reps", rest: "45 seg", rpe: "RPE 9" },
            { name: "Extensión de Tríceps con Cuerda", sets: "3 series", reps: "12-15 reps", rest: "60 seg", rpe: "RPE 9" }
          ]
        },
        {
          dayName: "Día 2: Tirón (Espalda, Trapecio, Bíceps)",
          exercises: [
            { name: "Dominadas Asistidas o Jalón al Pecho", sets: "4 series", reps: "10 reps", rest: "90 seg", rpe: "RPE 8" },
            { name: "Remo con Barra Prono", sets: "4 series", reps: "8-10 reps", rest: "90 seg", rpe: "RPE 8" },
            { name: "Face Pulls en Polea Alta", sets: "3 series", reps: "15 reps", rest: "60 seg", rpe: "RPE 8" },
            { name: "Curl de Bíceps con Barra Z", sets: "3 series", reps: "10-12 reps", rest: "60 seg", rpe: "RPE 9" }
          ]
        }
      ]
    },
    {
      id: "RUT-02",
      name: "Tonificación Glúteo & Core + Pilates Sculpt",
      coach: "Coach Sofía Méndez",
      goal: "Definición y Fuerza Funcional",
      kcalTarget: 1850,
      proteinGrams: 130,
      days: [
        {
          dayName: "Día 1: Tren Inferior Enfoque Glúteo",
          exercises: [
            { name: "Hip Thrust con Barra Olímpica", sets: "4 series", reps: "10-12 reps", rest: "90 seg", rpe: "RPE 9" },
            { name: "Sentadilla Búlgara con Mancuernas", sets: "3 series", reps: "10 reps c/pierna", rest: "75 seg", rpe: "RPE 8" },
            { name: "Peso Muerto Rumano", sets: "4 series", reps: "12 reps", rest: "75 seg", rpe: "RPE 8" },
            { name: "Abducción de Cadera en Máquina", sets: "3 series", reps: "20 reps", rest: "45 seg", rpe: "RPE 9" }
          ]
        }
      ]
    },
    {
      id: "RUT-03",
      name: "Recomposición Corporal & Quema de Grasa (HIIT)",
      coach: "Coach Diego Morales",
      goal: "Pérdida de Grasa Corporal",
      kcalTarget: 1950,
      proteinGrams: 150,
      days: [
        {
          dayName: "Circuito Metabólico Full Body",
          exercises: [
            { name: "Kettlebell Swings", sets: "4 rondas", reps: "20 reps", rest: "30 seg", rpe: "RPE 8" },
            { name: "Thrusters con Mancuernas", sets: "4 rondas", reps: "12 reps", rest: "30 seg", rpe: "RPE 8" },
            { name: "Remo Concept2 Ergómetro", sets: "4 rondas", reps: "300 metros", rest: "45 seg", rpe: "RPE 9" },
            { name: "Plancha Abdominal Dinámica", sets: "4 rondas", reps: "45 seg", rest: "30 seg", rpe: "RPE 8" }
          ]
        }
      ]
    },
    {
      id: "RUT-04",
      name: "Fuerza Atlética & CrossFit WOD",
      coach: "Head Coach Arturo Vega",
      goal: "Rendimiento y Potencia",
      kcalTarget: 3100,
      proteinGrams: 200,
      days: [
        {
          dayName: "WOD & Halterofilia",
          exercises: [
            { name: "Back Squat (Fuerza 5x5)", sets: "5 series", reps: "5 reps (82% 1RM)", rest: "120 seg", rpe: "RPE 9" },
            { name: "Power Clean + Push Jerk", sets: "5 EMOM", reps: "3 reps", rest: "Cada min", rpe: "RPE 8" },
            { name: "AMRAP 12 Min: Pull-ups + Burpees + Box Jumps", sets: "12 min", reps: "10 - 15 - 20", rest: "Sin pausa", rpe: "RPE 9.5" }
          ]
        }
      ]
    }
  ],
  boutiqueClasses: [
    {
      id: "CLS-PILATES",
      name: "Pilates Reformer Sculpt — 09:00 AM",
      instructor: "Sofía Méndez",
      room: "Salón Reformer Zen (12 Camas)",
      spotPrefix: "Reformer",
      spots: [
        { number: 1, status: "occupied", memberName: "Ana Paula G." },
        { number: 2, status: "available", memberName: null },
        { number: 3, status: "occupied", memberName: "Lucía F." },
        { number: 4, status: "occupied", memberName: "Valeria Garza Treviño" },
        { number: 5, status: "available", memberName: null },
        { number: 6, status: "occupied", memberName: "Mariana Torres Domínguez" },
        { number: 7, status: "available", memberName: null },
        { number: 8, status: "available", memberName: null },
        { number: 9, status: "occupied", memberName: "Camila R." },
        { number: 10, status: "maintenance", memberName: "Mantenimiento Resortes" },
        { number: 11, status: "available", memberName: null },
        { number: 12, status: "available", memberName: null }
      ]
    },
    {
      id: "CLS-CYCLING",
      name: "Indoor Cycling Beats & Watts — 07:00 PM",
      instructor: "Mateo Silva",
      room: "Dark Studio Cycling (16 Bicis Stages)",
      spotPrefix: "Bici",
      spots: [
        { number: 1, status: "occupied", memberName: "Alejandro Ramírez Soto" },
        { number: 2, status: "occupied", memberName: "Roberto Hernández Aguilar" },
        { number: 3, status: "available", memberName: null },
        { number: 4, status: "available", memberName: null },
        { number: 5, status: "occupied", memberName: "Diego L." },
        { number: 6, status: "occupied", memberName: "Valeria Garza Treviño" },
        { number: 7, status: "available", memberName: null },
        { number: 8, status: "occupied", memberName: "Paulina M." },
        { number: 9, status: "available", memberName: null },
        { number: 10, status: "available", memberName: null },
        { number: 11, status: "occupied", memberName: "Jorge V." },
        { number: 12, status: "available", memberName: null },
        { number: 13, status: "available", memberName: null },
        { number: 14, status: "occupied", memberName: "Daniela S." },
        { number: 15, status: "available", memberName: null },
        { number: 16, status: "available", memberName: null }
      ]
    }
  ],
  cashDrawer: {
    openedAt: "2026-10-31 06:00 AM",
    initialFund: 1500,
    cashExpenses: [
      { id: "EXP-1", concept: "Garrafones de agua y limpieza", amount: 180, time: "08:10 AM" }
    ],
    cutsHistory: [
      { id: "CORTE-101", date: "2026-10-30 10:00 PM", shift: "Vespertino", expectedCash: 4820, countedCash: 4820, difference: 0, cardTotal: 6450, cashier: "Miguel Ángel" }
    ]
  },
  superAdminAccount: {
    email: "Bruce.fernando@hotmail.com",
    password: "reynosa804",
    name: "Bruce Fernando — CEO & SuperAdmin SaaS"
  },
  tenants: [
    {
      id: "GYM-01",
      gymName: "Titanes Fitness & Studio MX",
      ownerName: "Carlos Rivera (Dueño)",
      email: "dueno@titanes.mx",
      password: "gym",
      city: "CDMX (Roma Norte)",
      rfcEmisor: "TFS2305109A1",
      plan: "basico",
      status: "activo",
      membersCount: 118,
      nextBillingDate: "2026-11-15",
      addons: {
        biometrics: false,
        domiciliacion: false,
        routinesApp: false,
        boutiqueMap: false,
        whatsappAi: false,
        multiBranch: false
      }
    },
    {
      id: "GYM-02",
      gymName: "Olympus Iron Gym GDL",
      ownerName: "Jorge Hernández",
      email: "admin@olympusgdl.mx",
      password: "gym",
      city: "Guadalajara, JAL",
      rfcEmisor: "OIG2103148B9",
      plan: "pro",
      status: "activo",
      membersCount: 385,
      nextBillingDate: "2026-11-10",
      addons: {
        biometrics: true,
        domiciliacion: true,
        routinesApp: true,
        boutiqueMap: false,
        whatsappAi: true,
        multiBranch: false
      }
    },
    {
      id: "GYM-03",
      gymName: "Velvet Pilates & Cycling Studio",
      ownerName: "Mariana Elizondo",
      email: "hola@velvetstudio.mx",
      password: "gym",
      city: "San Pedro Garza García, NL",
      rfcEmisor: "VPC240119M33",
      plan: "boutique",
      status: "activo",
      membersCount: 240,
      nextBillingDate: "2026-11-22",
      addons: {
        biometrics: true,
        domiciliacion: true,
        routinesApp: true,
        boutiqueMap: true,
        whatsappAi: true,
        multiBranch: true
      }
    },
    {
      id: "GYM-04",
      gymName: "Espartanos Box & Pesas (Ex-BDKGYM)",
      ownerName: "Luis Fernando Soto",
      email: "contacto@espartanos.mx",
      password: "gym",
      city: "Querétaro, QRO",
      rfcEmisor: "EBP190822K10",
      plan: "basico",
      status: "activo",
      membersCount: 142,
      nextBillingDate: "2026-11-05",
      addons: {
        biometrics: true,
        domiciliacion: false,
        routinesApp: false,
        boutiqueMap: false,
        whatsappAi: false,
        multiBranch: false
      }
    }
  ]
};

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf8');
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    let updated = false;
    if (!db.superAdminAccount || db.superAdminAccount.email !== INITIAL_DB.superAdminAccount.email || db.superAdminAccount.password !== INITIAL_DB.superAdminAccount.password) {
      db.superAdminAccount = { ...INITIAL_DB.superAdminAccount };
      updated = true;
    }
    if (!db.tenants) {
      db.tenants = INITIAL_DB.tenants;
      updated = true;
    }
    if (updated) saveDb(db);
    return db;
  } catch (e) {
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // API Routes
  if (pathname === '/api/state' && req.method === 'GET') {
    const db = loadDb();
    return sendJson(res, 200, db);
  }

  // Authentication (SuperAdmin or Gym Owner Login)
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (email === db.superAdminAccount.email.toLowerCase() && password === db.superAdminAccount.password) {
      return sendJson(res, 200, {
        ok: true,
        session: {
          role: 'superadmin',
          email: db.superAdminAccount.email,
          name: db.superAdminAccount.name,
          tenantId: null
        }
      });
    }

    const tenant = (db.tenants || []).find(t => t.email.toLowerCase() === email && t.password === password);
    if (!tenant) {
      return sendJson(res, 401, {
        ok: false,
        error: 'Credenciales inválidas. Usa los botones de Acceso Rápido o verifica tu correo y contraseña.'
      });
    }

    if (tenant.status === 'suspendido') {
      return sendJson(res, 403, {
        ok: false,
        error: `El gimnasio "${tenant.gymName}" tiene su suscripción SaaS suspendida por falta de pago. Contacta al SuperAdmin.`
      });
    }

    // Sync active gym config to this tenant
    db.saasConfig.gymName = tenant.gymName;
    db.saasConfig.rfcEmisor = tenant.rfcEmisor;
    db.saasConfig.currentPlan = tenant.plan;
    db.saasConfig.addons = { ...tenant.addons };
    saveDb(db);

    return sendJson(res, 200, {
      ok: true,
      session: {
        role: 'gym_owner',
        email: tenant.email,
        name: tenant.ownerName,
        gymName: tenant.gymName,
        tenantId: tenant.id
      }
    });
  }

  // SuperAdmin: Create a new Gym Client (Tenant)
  if (pathname === '/api/superadmin/tenants' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const newTenant = {
      id: `GYM-0${(db.tenants || []).length + 1}`,
      gymName: body.gymName || 'Nuevo Gimnasio MX',
      ownerName: body.ownerName || 'Dueño de Gimnasio',
      email: (body.email || 'dueno@nuevogym.mx').trim().toLowerCase(),
      password: body.password || 'gym',
      city: body.city || 'CDMX, México',
      rfcEmisor: (body.rfcEmisor || 'XAXX010101000').toUpperCase(),
      plan: body.plan || 'basico',
      status: 'activo',
      membersCount: 1,
      nextBillingDate: '2026-11-30',
      addons: {
        biometrics: Boolean(body.biometrics),
        domiciliacion: Boolean(body.domiciliacion),
        routinesApp: Boolean(body.routinesApp),
        boutiqueMap: Boolean(body.boutiqueMap),
        whatsappAi: Boolean(body.whatsappAi),
        multiBranch: Boolean(body.multiBranch)
      }
    };
    db.tenants.unshift(newTenant);
    saveDb(db);
    return sendJson(res, 201, { ok: true, tenant: newTenant });
  }

  // SuperAdmin: Update a Gym Client's plan, add-on modules, or status
  if (pathname === '/api/superadmin/tenant-update' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const tenant = (db.tenants || []).find(t => t.id === body.tenantId);
    if (!tenant) return sendJson(res, 404, { ok: false, error: 'Gimnasio no encontrado' });

    if (body.plan && db.plansCatalog[body.plan]) {
      tenant.plan = body.plan;
    }
    if (body.status) {
      tenant.status = body.status;
    }
    if (body.addons && typeof body.addons === 'object') {
      tenant.addons = { ...tenant.addons, ...body.addons };
    }

    // If this tenant is currently loaded in saasConfig, keep it synced
    if (db.saasConfig.gymName === tenant.gymName) {
      db.saasConfig.currentPlan = tenant.plan;
      db.saasConfig.addons = { ...tenant.addons };
    }
    saveDb(db);
    return sendJson(res, 200, { ok: true, tenant });
  }

  // SuperAdmin: Impersonate / Enter a Gym's operational panel
  if (pathname === '/api/superadmin/impersonate' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const tenant = (db.tenants || []).find(t => t.id === body.tenantId);
    if (!tenant) return sendJson(res, 404, { ok: false, error: 'Gimnasio no encontrado' });

    db.saasConfig.gymName = tenant.gymName;
    db.saasConfig.rfcEmisor = tenant.rfcEmisor;
    db.saasConfig.currentPlan = tenant.plan;
    db.saasConfig.addons = { ...tenant.addons };
    saveDb(db);
    return sendJson(res, 200, { ok: true, tenant });
  }

  // Update SaaS Plan or Individual Add-on Modules
  if (pathname === '/api/saas/plan' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    if (body.plan && db.plansCatalog[body.plan]) {
      db.saasConfig.currentPlan = body.plan;
    }
    if (body.addons && typeof body.addons === 'object') {
      db.saasConfig.addons = { ...db.saasConfig.addons, ...body.addons };
    }
    if (typeof body.offlineModeSimulated === 'boolean') {
      db.saasConfig.offlineModeSimulated = body.offlineModeSimulated;
    }
    if (body.activeBranchId) {
      db.saasConfig.activeBranchId = body.activeBranchId;
    }
    // Also sync back to matching tenant in db.tenants
    const matchingTenant = (db.tenants || []).find(t => t.gymName === db.saasConfig.gymName);
    if (matchingTenant) {
      matchingTenant.plan = db.saasConfig.currentPlan;
      matchingTenant.addons = { ...db.saasConfig.addons };
    }
    saveDb(db);
    return sendJson(res, 200, { ok: true, saasConfig: db.saasConfig });
  }

  // Add or update member
  if (pathname === '/api/members' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const newId = `SOC-${1001 + db.members.length}`;
    const days = Number(body.daysRemaining ?? 30);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);

    const newMember = {
      id: newId,
      name: body.name || "Socio Nuevo",
      phone: (body.phone || "525500000000").replace(/\D/g, ''),
      email: body.email || "socio@email.mx",
      rfc: (body.rfc || "XAXX010101000").toUpperCase(),
      razonSocial: (body.razonSocial || body.name || "PUBLICO EN GENERAL").toUpperCase(),
      regimenFiscal: body.regimenFiscal || "605 - Sueldos y Salarios",
      cpFiscal: body.cpFiscal || "06700",
      membershipType: body.membershipType || "Mensualidad Pesas + Cardio",
      price: Number(body.price || 750),
      status: days > 5 ? "activo" : (days >= 0 ? "por_vencer" : "vencido"),
      expiresAt: expDate.toISOString().split('T')[0],
      daysRemaining: days,
      biometricEnrolled: Boolean(body.biometricEnrolled ?? true),
      faceEnrolled: Boolean(body.faceEnrolled ?? false),
      domiciliado: Boolean(body.domiciliado ?? false),
      cardLast4: body.domiciliado ? (body.cardLast4 || "4242") : null,
      cardBrand: body.domiciliado ? "Visa (Stripe MX)" : "Efectivo en Recepción",
      routineId: body.routineId || "RUT-01",
      weightKg: Number(body.weightKg || 72),
      bodyFatPct: Number(body.bodyFatPct || 18),
      branchId: db.saasConfig.activeBranchId,
      lastCheckIn: "Recién inscrito"
    };
    db.members.unshift(newMember);
    saveDb(db);
    return sendJson(res, 201, { ok: true, member: newMember });
  }

  // POS Checkout
  if (pathname === '/api/pos/checkout' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const ticketNum = 8901 + db.sales.length;
    const ticketId = `TCK-${ticketNum}`;
    const folioAutofactura = `AF-${ticketNum}-MX`;
    const total = Number(body.total || 0);
    const subtotal = Number((total / 1.16).toFixed(2));
    const iva = Number((total - subtotal).toFixed(2));

    let memberName = "Público en General (Recepción)";
    if (body.memberId && body.memberId !== "PUBLICO") {
      const member = db.members.find(m => m.id === body.memberId);
      if (member) {
        memberName = member.name;
        // If buying a membership, renew member automatically!
        const hasMembershipItem = (body.items || []).some(it => it.durationDays && it.durationDays > 0);
        if (hasMembershipItem) {
          const extraDays = (body.items || []).reduce((acc, it) => acc + (Number(it.durationDays) || 0), 0);
          member.daysRemaining = Math.max(0, member.daysRemaining) + extraDays;
          member.status = "activo";
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + member.daysRemaining);
          member.expiresAt = expDate.toISOString().split('T')[0];
        }
      }
    }

    const nowStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const sale = {
      id: ticketId,
      folioAutofactura,
      timestamp: `2026-10-31 ${nowStr}`,
      memberId: body.memberId || "PUBLICO",
      memberName,
      items: body.items || [],
      subtotal,
      iva,
      total,
      paymentMethod: body.paymentMethod || "Efectivo",
      invoiced: false,
      cfdiUuid: null,
      cashier: "Recepción En Turno"
    };

    db.sales.unshift(sale);
    saveDb(db);
    return sendJson(res, 201, { ok: true, sale });
  }

  // Cash Drawer Cut (Corte de Caja Ciego)
  if (pathname === '/api/pos/corte' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const cashSales = db.sales
      .filter(s => s.paymentMethod === 'Efectivo')
      .reduce((sum, s) => sum + s.total, 0);
    const cardSales = db.sales
      .filter(s => s.paymentMethod !== 'Efectivo')
      .reduce((sum, s) => sum + s.total, 0);
    const expenses = db.cashDrawer.cashExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = db.cashDrawer.initialFund + cashSales - expenses;
    const countedCash = Number(body.countedCash || expectedCash);

    const cut = {
      id: `CORTE-${102 + db.cashDrawer.cutsHistory.length}`,
      date: `2026-10-31 ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      shift: body.shift || "Matutino",
      expectedCash,
      countedCash,
      difference: countedCash - expectedCash,
      cardTotal: cardSales,
      cashier: body.cashier || "Recepción Principal"
    };
    db.cashDrawer.cutsHistory.unshift(cut);
    saveDb(db);
    return sendJson(res, 201, { ok: true, cut });
  }

  // Access Control Check-In (QR / Huella ZKTeco / Rostro Hikvision)
  if (pathname === '/api/access/checkin' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const query = (body.query || "").trim().toUpperCase();
    const method = body.method || "QR Recepción";

    const member = db.members.find(m =>
      m.id.toUpperCase() === query ||
      m.name.toUpperCase().includes(query)
    );

    const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    if (!member) {
      const log = {
        id: `ACC-${502 + db.accessLogs.length}`,
        time: timeStr,
        memberId: query || "DESCONOCIDO",
        memberName: "Código / Huella No Encontrada",
        method,
        allowed: false,
        note: "Usuario no registrado en padrón - Torniquete bloqueado"
      };
      db.accessLogs.unshift(log);
      saveDb(db);
      return sendJson(res, 404, { ok: false, allowed: false, log, member: null });
    }

    const allowed = member.daysRemaining >= 0;
    let note = allowed
      ? `Acceso concedido (${member.daysRemaining} días restantes) — Pulso Relé Torniquete OK`
      : `Membresía vencida hace ${Math.abs(member.daysRemaining)} días — Pasar a Recepción`;

    if (db.saasConfig.offlineModeSimulated) {
      note += " [Validado en Caché Local Offline SQLite]";
    }

    member.lastCheckIn = `Hoy ${timeStr}`;

    const log = {
      id: `ACC-${502 + db.accessLogs.length}`,
      time: timeStr,
      memberId: member.id,
      memberName: member.name,
      method,
      allowed,
      note
    };

    db.accessLogs.unshift(log);
    saveDb(db);
    return sendJson(res, 200, { ok: true, allowed, log, member });
  }

  // CFDI 4.0 Self-Invoicing / Timbrado SAT
  if (pathname === '/api/cfdi/timbrar' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const folioOrTicket = (body.folio || "").trim().toUpperCase();
    const sale = db.sales.find(s =>
      s.id.toUpperCase() === folioOrTicket ||
      s.folioAutofactura.toUpperCase() === folioOrTicket
    );

    if (!sale) {
      return sendJson(res, 404, {
        ok: false,
        error: "No se encontró el Ticket o Folio de Autofacturación. Prueba con AF-8902-MX o AF-8904-MX."
      });
    }

    if (sale.invoiced) {
      const existing = db.invoices.find(i => i.ticketId === sale.id);
      return sendJson(res, 200, { ok: true, alreadyInvoiced: true, invoice: existing });
    }

    const uuid = crypto.randomUUID().toUpperCase();
    const newInvoice = {
      uuid,
      serieFolio: `A-${1042 + db.invoices.length}`,
      ticketId: sale.id,
      fechaTimbrado: new Date().toISOString().slice(0, 19),
      rfcReceptor: (body.rfc || "XAXX010101000").toUpperCase(),
      nombreReceptor: (body.razonSocial || sale.memberName || "PUBLICO EN GENERAL").toUpperCase(),
      regimenReceptor: (body.regimenFiscal || "605").slice(0, 3),
      cpReceptor: body.cpFiscal || "06700",
      usoCfdi: body.usoCfdi || "G03 - Gastos en general",
      claveProdServ: "93141500",
      subtotal: sale.subtotal,
      iva: sale.iva,
      total: sale.total,
      pac: "Facturapi / SAT CFDI 4.0",
      status: "Vigente"
    };

    sale.invoiced = true;
    sale.cfdiUuid = uuid;
    db.invoices.unshift(newInvoice);
    saveDb(db);
    return sendJson(res, 201, { ok: true, invoice: newInvoice });
  }

  // Boutique Map Spot Booking
  if (pathname === '/api/boutique/book' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const cls = db.boutiqueClasses.find(c => c.id === body.classId);
    if (!cls) return sendJson(res, 404, { ok: false, error: "Clase no encontrada" });

    const spot = cls.spots.find(s => s.number === Number(body.spotNumber));
    if (!spot) return sendJson(res, 404, { ok: false, error: "Lugar no encontrado" });

    if (spot.status === "occupied") {
      spot.status = "available";
      spot.memberName = null;
    } else if (spot.status === "available") {
      spot.status = "occupied";
      spot.memberName = body.memberName || "Socio Reservado";
    }
    saveDb(db);
    return sendJson(res, 200, { ok: true, boutiqueClass: cls });
  }

  // Assign routine to member
  if (pathname === '/api/routines/assign' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDb();
    const member = db.members.find(m => m.id === body.memberId);
    if (member && body.routineId) {
      member.routineId = body.routineId;
      saveDb(db);
    }
    return sendJson(res, 200, { ok: true, member });
  }

  // Serve Static Files
  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexFallback = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexFallback)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      });
      fs.createReadStream(indexFallback).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`NexGym Cloud MX (BDKGYM en la Nube) corriendo en http://localhost:${PORT}`);
});
