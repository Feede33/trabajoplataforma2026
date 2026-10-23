import { JobWithEmpresa, Profile, ApplicationWithDetails, InformalJob } from './supabase/database.types'

export const MOCK_EMPRESAS: Profile[] = [
  {
    id: 'emp-1',
    role: 'empresa',
    nombre: 'MercadoLibre Tech',
    email: 'careers@mercadolibre.com',
    avatar_url: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=120&h=120&q=80',
    bio: 'Líder en comercio electrónico y soluciones fintech en América Latina.',
    ubicacion: 'Montevideo, Uruguay',
    cv_url: null,
    website: 'https://mercadolibre.com.uy',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'emp-2',
    role: 'empresa',
    nombre: 'Logística Oriental',
    email: 'rrhh@logisticaoriental.com.uy',
    avatar_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&h=120&q=80',
    bio: 'Operador logístico integral con más de 20 años conectando rutas y empresas en los 19 departamentos del Uruguay.',
    ubicacion: 'Canelones, Uruguay',
    cv_url: null,
    website: 'https://logisticaoriental.com.uy',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'emp-3',
    role: 'empresa',
    nombre: 'Globant Studios',
    email: 'talent@globant.com',
    avatar_url: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&h=120&q=80',
    bio: 'Compañía de servicios de tecnología que reinventa las industrias con software innovador.',
    ubicacion: 'Salto, Uruguay',
    cv_url: null,
    website: 'https://globant.com',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'emp-4',
    role: 'empresa',
    nombre: 'NutriSalud Group',
    email: 'contacto@nutrisalud.com.uy',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
    bio: 'Grupo de clínicas y servicios de salud y nutrición con alcance nacional.',
    ubicacion: 'Punta del Este, Maldonado',
    cv_url: null,
    website: 'https://nutrisalud.com.uy',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'emp-5',
    role: 'empresa',
    nombre: 'Agencia Digital Pixel',
    email: 'hola@pixelagencia.com.uy',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
    bio: 'Agencia de marketing digital, branding y diseño enfocada en startups de alto crecimiento.',
    ubicacion: 'Maldonado, Uruguay',
    cv_url: null,
    website: 'https://pixelagencia.com.uy',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }
]

export const MOCK_JOBS: JobWithEmpresa[] = [
  {
    id: 'job-1',
    empresa_id: 'emp-1',
    titulo: 'Desarrollador Full Stack Senior (React + Node.js)',
    descripcion: `Estamos en búsqueda de un Desarrollador Full Stack Senior para sumarse a nuestro equipo de producto en Uruguay.
    
**Responsabilidades principales:**
- Diseñar e implementar microservicios escalables de alta concurrencia.
- Desarrollar interfaces modernas, accesibles y responsivas con React y TypeScript.
- Participar activamente en decisiones de arquitectura y revisiones de código.
- Colaborar estrechamente con diseñadores UI/UX y Product Managers.

**Requisitos:**
- +4 años de experiencia sólida en desarrollo web (JavaScript/TypeScript).
- Experiencia comprobable con React, Next.js, Node.js y bases de datos relacionales (PostgreSQL).
- Conocimientos en pruebas unitarias y de integración (Jest, Cypress).
- Capacidad para trabajar de manera autónoma con metodologías ágiles.

**Beneficios:**
- Trabajo 100% remoto desde cualquier departamento del Uruguay con horario flexible.
- Bono anual por desempeño.
- Seguro médico privado de primer nivel (MP o Summum) para vos y tu grupo familiar.
- Presupuesto anual de capacitación y equipamiento para home office.`,
    rubro: 'Tecnología',
    zona: 'Remoto (Uruguay)',
    modalidad: 'remoto',
    tipo_contrato: 'full-time',
    salario_rango: '$85.000 - $120.000 UYU',
    estado: 'activo',
    slug: 'desarrollador-full-stack-senior-react-node',
    tags: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    empresa: {
      nombre: 'MercadoLibre Tech',
      avatar_url: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=120&h=120&q=80',
      website: 'https://mercadolibre.com.uy',
      ubicacion: 'Montevideo, Uruguay',
    }
  },
  {
    id: 'job-2',
    empresa_id: 'emp-2',
    titulo: 'Coordinador de Logística y Flota de Transporte',
    descripcion: `Importante empresa de transporte y logística incorpora Coordinador de Operaciones para su centro de distribución en Ruta 101.

**Responsabilidades:**
- Planificación y optimización de rutas de distribución en Montevideo, área metropolitana e interior del país.
- Supervisión del estado general de la flota de camiones y utilitarios.
- Asignación de cargas, hojas de ruta y gestión de personal de choferes.
- Control de remitos, seguimiento satelital y tiempos de entrega.

**Requisitos:**
- Experiencia mínima de 3 años en puestos similares de logística y distribución.
- Manejo avanzado de sistemas de ruteo y planillas de cálculo.
- Disponibilidad para realizar turnos rotativos.
- Residencia en Canelones, Ciudad de la Costa o Montevideo.

**Ofrecemos:**
- Contratación directa en planilla.
- Almuerzo a cargo de la empresa.
- Excelente clima laboral y plan de carrera en expansión.`,
    rubro: 'Logística',
    zona: 'Canelones (Ruta 101)',
    modalidad: 'presencial',
    tipo_contrato: 'full-time',
    salario_rango: '$55.000 - $72.000 UYU',
    estado: 'activo',
    slug: 'coordinador-logistica-flota-transporte',
    tags: ['Logística', 'Ruteo', 'Flota', 'Distribución', 'Excel'],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    empresa: {
      nombre: 'Logística Oriental',
      avatar_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&h=120&q=80',
      website: 'https://logisticaoriental.com.uy',
      ubicacion: 'Canelones, Uruguay',
    }
  },
  {
    id: 'job-3',
    empresa_id: 'emp-3',
    titulo: 'Diseñador UI/UX & Product Designer',
    descripcion: `Sumate a nuestro estudio de diseño para cocrear productos digitales de clase mundial desde Uruguay.
    
**Qué harás:**
- Diseñar flujos de usuario intuitivos, wireframes interactivos y prototipos de alta fidelidad en Figma.
- Conducir entrevistas y pruebas de usabilidad con usuarios reales.
- Mantener y escalar nuestro Design System.
- Trabajar mano a mano con el equipo de frontend asegurando fidelidad de implementación.

**Qué buscamos:**
- Portfolio comprobable que demuestre criterio estético y resolución de problemas funcionales.
- Dominio absoluto de Figma, Auto Layout y variables de diseño.
- Experiencia en diseño web y mobile (iOS / Android).
- Inglés intermedio / avanzado.`,
    rubro: 'Diseño',
    zona: 'Montevideo / Remoto',
    modalidad: 'hibrido',
    tipo_contrato: 'full-time',
    salario_rango: '$68.000 - $92.000 UYU',
    estado: 'activo',
    slug: 'disenador-ui-ux-product-designer',
    tags: ['Figma', 'UI/UX', 'Design Systems', 'User Research', 'Mobile'],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    empresa: {
      nombre: 'Globant Studios',
      avatar_url: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&h=120&q=80',
      website: 'https://globant.com',
      ubicacion: 'Salto, Uruguay',
    }
  },
  {
    id: 'job-4',
    empresa_id: 'emp-5',
    titulo: 'Especialista en Growth Marketing & Paid Media',
    descripcion: `Buscamos un analista o especialista con foco en adquisición de clientes para campañas en Meta Ads, Google Ads y TikTok Ads.
    
**Responsabilidades:**
- Configuración, optimización diaria y escalado de campañas pagas.
- Medición de conversiones, CPA, ROAS y LTV.
- Propuestas de creatividades y copy para testeo A/B.
- Informes mensuales y dashboards con métricas claras.

**Requisitos:**
- Experiencia comprobable gestionando presupuestos mensuales superiores a $10.000 USD.
- Manejo analítico riguroso con Google Analytics 4 y Looker Studio.
- Proactividad, orientación a resultados y mentalidad de experimentación constante.`,
    rubro: 'Marketing',
    zona: 'Maldonado / Remoto',
    modalidad: 'remoto',
    tipo_contrato: 'freelance',
    salario_rango: 'USD $1.200 - $1.800 / mes',
    estado: 'activo',
    slug: 'especialista-growth-marketing-paid-media',
    tags: ['Meta Ads', 'Google Ads', 'Analytics', 'Growth', 'Copywriting'],
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    empresa: {
      nombre: 'Agencia Digital Pixel',
      avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
      website: 'https://pixelagencia.com.uy',
      ubicacion: 'Maldonado, Uruguay',
    }
  },
  {
    id: 'job-5',
    empresa_id: 'emp-4',
    titulo: 'Analista Contable y de Facturación',
    descripcion: `Clínica de salud líder incorpora profesional o estudiante avanzado de Contador Público (FCEA / UdelaR o universidades privadas) o Administración de Empresas.

**Tareas principales:**
- Conciliaciones bancarias y de cuentas corrientes de mutualistas y seguros médicos.
- Facturación electrónica (CFE) ante DGI, liquidaciones de BPS y control impositivo.
- Carga de comprobantes y gestión de pagos a proveedores.
- Asistencia en la elaboración de balances mensuales.

**Requisitos:**
- Al menos 2 años de experiencia en áreas contables o de administración de salud en Uruguay.
- Manejo de sistemas de gestión contable (Memory Conty, GNS, ZetaSoftware o similares).
- Atención a los detalles y buenas relaciones interpersonales.`,
    rubro: 'Administración',
    zona: 'Montevideo (Pocitos)',
    modalidad: 'presencial',
    tipo_contrato: 'full-time',
    salario_rango: '$48.000 - $62.000 UYU',
    estado: 'activo',
    slug: 'analista-contable-facturacion-salud',
    tags: ['Contabilidad', 'Facturación', 'DGI', 'BPS', 'Excel'],
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    empresa: {
      nombre: 'NutriSalud Group',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      website: 'https://nutrisalud.com.uy',
      ubicacion: 'Punta del Este, Maldonado',
    }
  },
  {
    id: 'job-6',
    empresa_id: 'emp-2',
    titulo: 'Chofer de Mudanzas y Fletes con Libreta Profesional',
    descripcion: `Buscamos choferes responsables para unidad utilitaria (Master / Sprinter) y camión liviano para servicios de fletes, transportes y mudanzas particulares y corporativas.

**Requisitos:**
- Libreta de conducir profesional al día (Categoría B, C o E).
- Experiencia mínima de 2 años en reparto, fletes o mudanzas urbanas en Montevideo y Área Metropolitana.
- Excelente trato con los clientes y vocación de servicio.
- Disponibilidad horaria incluyendo sábados por la mañana.

**Se ofrece:**
- Salario por laudo del sector + viáticos y adicionales por servicio.
- Vehículo a cargo de la empresa con seguro y mantenimiento al día.`,
    rubro: 'Logística',
    zona: 'Montevideo (Zona Prado / Paso Molino)',
    modalidad: 'presencial',
    tipo_contrato: 'full-time',
    salario_rango: '$42.000 - $54.000 UYU',
    estado: 'activo',
    slug: 'chofer-mudanzas-fletes-licencia-profesional',
    tags: ['Chofer', 'Mudanzas', 'Fletes', 'Libreta Profesional', 'Montevideo'],
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    empresa: {
      nombre: 'Logística Oriental',
      avatar_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&h=120&q=80',
      website: 'https://logisticaoriental.com.uy',
      ubicacion: 'Canelones, Uruguay',
    }
  }
]

export const MOCK_CANDIDATO: Profile = {
  id: 'cand-1',
  role: 'candidato',
  nombre: 'Martín Gómez',
  email: 'martin.gomez@ejemplo.com',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  bio: 'Desarrollador frontend apasionado por React, TypeScript y arquitecturas web modernas con 3 años de experiencia.',
  ubicacion: 'Montevideo, Uruguay',
  cv_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  website: 'https://martingomez.dev',
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
}

export const MOCK_APPLICATIONS: ApplicationWithDetails[] = [
  {
    id: 'app-1',
    job_id: 'job-1',
    candidato_id: 'cand-1',
    mensaje: 'Hola! Tengo más de 3 años desarrollando con Next.js y TypeScript y me entusiasma enormemente sumarme al equipo de MercadoLibre.',
    estado: 'entrevista',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    job: {
      titulo: 'Desarrollador Full Stack Senior (React + Node.js)',
      slug: 'desarrollador-full-stack-senior-react-node',
    },
    candidato: {
      nombre: 'Martín Gómez',
      email: 'martin.gomez@ejemplo.com',
      cv_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      bio: 'Desarrollador frontend con 3 años de experiencia en React y Next.js.',
      ubicacion: 'Montevideo, Uruguay',
    }
  },
  {
    id: 'app-2',
    job_id: 'job-3',
    candidato_id: 'cand-1',
    mensaje: 'Cuento con amplia experiencia en UI/UX y maquetado con Tailwind CSS.',
    estado: 'pendiente',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    job: {
      titulo: 'Diseñador UI/UX & Product Designer',
      slug: 'disenador-ui-ux-product-designer',
    },
    candidato: {
      nombre: 'Martín Gómez',
      email: 'martin.gomez@ejemplo.com',
      cv_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      bio: 'Desarrollador frontend con 3 años de experiencia en React y Next.js.',
      ubicacion: 'Montevideo, Uruguay',
    }
  }
]

export const MOCK_INFORMAL_JOBS: InformalJob[] = [
  {
    id: 'inf-1',
    titulo: 'Choferes para taxi (Diurno o Nocturno)',
    cargo: 'Chofer para taxi',
    rubro: 'Transporte y Choferes',
    zona: null,
    horario: 'Diurno o nocturno',
    descripcion: 'CHOFERES para taxi diurno nocturno o trabajar solo, radio taxi 141 con o sin experiencia; enviar foto de libreta al WhatsApp o llamar.',
    whatsapp: '093609479',
    telefono: '094920807',
    email: null,
    direccion: null,
    contacto_whatsapp: '093609479',
    contacto_indicaciones: 'Enviar foto de libreta por WhatsApp',
    salario: null,
    raw_text: 'CHOFERES para taxi diurno nocturno o trabajar solo, radio taxi 141 con o sin experiencia; enviar foto de libreta al WhatsApp cel 093609479 - 094920807 Cod.Web.298982761',
    activo: true,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'inf-2',
    titulo: 'Mecánico aprendiz para Lubricentro',
    cargo: 'Mecánico aprendiz',
    rubro: 'Mecánica y Talleres',
    zona: null,
    horario: null,
    descripcion: 'MECÁNICO aprendiz o estudiante de mecánica entre 23 y 40 años para cambios de aceite en importante Lubricentro. Enviar CV por email.',
    whatsapp: null,
    telefono: null,
    email: 'lubricantes13@hotmail.com',
    direccion: null,
    contacto_whatsapp: null,
    contacto_indicaciones: 'Enviar CV únicamente al correo indicado',
    salario: null,
    raw_text: 'MECÁNICO aprendiz o estudiante de mecánica entre 23 y 40 años para cambios de aceite en importante Lubricentro. Enviar CV a: lubricantes13@hotmail.com Cod.Web.299225191',
    activo: true,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'inf-3',
    titulo: 'Manicura y Depiladora con experiencia',
    cargo: 'Manicura',
    rubro: 'Belleza y Estética',
    zona: 'Piedras Blancas',
    horario: null,
    descripcion: 'MANICURA, alquilo espacio por mes con clientela fija. Zona Piedras Blancas. Todas las comodidades.',
    whatsapp: '091315611',
    telefono: '091315611',
    email: null,
    direccion: null,
    contacto_whatsapp: '091315611',
    contacto_indicaciones: 'Consultas por WhatsApp',
    salario: null,
    raw_text: 'MANICURA, alquilo espacio por mes con clientela fija. Zona Piedras Blancas. Todas las comodidades. 091315611 Cod.Web.298490651',
    activo: true,
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: 'inf-4',
    titulo: 'Chófer de taxi (Capacitación incluida)',
    cargo: 'Chófer de taxi',
    rubro: 'Transporte y Choferes',
    zona: 'Montevideo',
    horario: null,
    descripcion: 'CHÓFER de taxi: personal con o sin experiencia previa. Ofrecemos capacitación y acompañamiento para una incorporación ágil al rubro. Requisitos: buena presencia y libreta Categoría E (Montevideo).',
    whatsapp: '094465225',
    telefono: '094465225',
    email: 'carloschodjiklian@gmail.com',
    direccion: null,
    contacto_whatsapp: '094465225',
    contacto_indicaciones: 'Comunicarse al 094465225 o enviar CV por email',
    salario: null,
    raw_text: 'CHÓFER de taxi: personal con o sin experiencia previa. Ofrecemos capacitación y acompañamiento para una incorporación ágil al rubro del taxi. Excelentes condiciones laborales y formación continua. Requisitos: buena presencia y libreta de conducir Categoría E (Montevideo). Interesados comunicarse al 094465225 o enviar CV a carloschodjiklian@gmail.com Cod.Web.298580881',
    activo: true,
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: 'inf-5',
    titulo: 'Choferes para taxi en Paso Carrasco',
    cargo: 'Chofer de taxi',
    rubro: 'Transporte y Choferes',
    zona: 'Paso Carrasco',
    horario: null,
    descripcion: 'CHOFERES para taxi, Paso Carrasco, con uber y spotify. Presentarse a tratar personalmente.',
    whatsapp: null,
    telefono: null,
    email: null,
    direccion: '8 de Octubre 3576',
    contacto_whatsapp: null,
    contacto_indicaciones: 'Presentarse directamente en 8 de Octubre 3576',
    salario: null,
    raw_text: 'CHOFERES para taxi, Paso Carrasco, con uber y spotify. Tratar en 8 de Octubre 3576 Cod.Web.299576181',
    activo: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'inf-6',
    titulo: 'Cajera para local de comidas (Paso Molino)',
    cargo: 'Cajera',
    rubro: 'Gastronomía',
    zona: 'Paso Molino',
    horario: 'Turno vespertino 17 a 01am',
    descripcion: 'Estamos buscando personal para local de comidas, ubicado en la zona del Paso Molino, para el turno vespertino 17 a 01am. Para el cargo: CAJERA.',
    whatsapp: '092327302',
    telefono: null,
    email: null,
    direccion: null,
    contacto_whatsapp: '092327302',
    contacto_indicaciones: 'WhatsApp (no llamar por favor)',
    salario: null,
    raw_text: 'Estamos buscando personal para local de comidas, ubicado en la zona del Paso Molino, para el turno vespertino 17 a 01am.\nPara el cargo : CAJERA\nNuestro contacto para enviar cv es:\nWhatsApp ( no llamar porfavor)\n* 092327302 •.',
    activo: true,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 36 * 3600000).toISOString(),
  }
]
