import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft, Mail, RefreshCw, UserCheck, Database, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad | Postulauy.com',
  description: 'Política de Privacidad de Postulauy.com. Conocé cómo protegemos, procesamos y resguardamos tus datos personales conforme a la Ley N° 18.331 de Uruguay y normativas internacionales.',
  alternates: {
    canonical: 'https://postulauy.com/privacy-policy',
  },
}

export default function PrivacyPolicyPage() {
  const lastUpdated = '24 de Octubre de 2026'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Transparencia y Seguridad
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Política de Privacidad
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            En <span className="font-semibold text-slate-900 dark:text-white">Postulauy.com</span> valoramos y respetamos tu derecho a la privacidad. Esta política describe con claridad qué información recopilamos, cómo la utilizamos, bajo qué medidas de seguridad la protegemos y cómo podés ejercer tus derechos sobre tus datos personales.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 gap-2">
            <span>Última actualización: <strong>{lastUpdated}</strong></span>
            <span>Ámbito de aplicación: <strong>República Oriental del Uruguay y usuarios internacionales</strong></span>
          </div>
        </div>

        {/* Policy Body */}
        <div className="space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">1</span>
              Responsable del Tratamiento
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              El responsable del tratamiento de los datos personales recopilados a través del sitio web{' '}
              <strong className="text-slate-900 dark:text-white">https://postulauy.com</strong> es <strong>PostulaUY</strong>, con domicilio operativo en Montevideo, Uruguay. Para cualquier consulta, inquietud o ejercicio de derechos sobre tus datos personales, podés comunicarte con nuestro equipo a través del correo oficial:{' '}
              <a href="mailto:contacto@postulauy.com" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                contacto@postulauy.com
              </a>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">2</span>
              Marco Legal Aplicable
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              El tratamiento de datos personales en PostulaUY se rige estrictamente por la legislación uruguaya, en particular por la <strong>Ley N° 18.331 de Protección de Datos Personales y Acción de Habeas Data</strong>, su Decreto Reglamentario N° 414/009 y las resoluciones de la Unidad Reguladora y de Control de Datos Personales (URCDP), garantizando principios de legalidad, veracidad, finalidad, seguridad y confidencialidad.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">3</span>
              Información que Recopilamos
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Recopilamos únicamente los datos necesarios para brindar los servicios de conexión laboral entre candidatos y empleadores:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <li>
                <strong>Datos de Registro y Autenticación:</strong> Nombre y apellido, dirección de correo electrónico, contraseña cifrada, y rol de usuario (candidato o empresa).
              </li>
              <li>
                <strong>Autenticación con Terceros (Google OAuth):</strong> Si decidís iniciar sesión mediante Google, recibimos tu nombre, dirección de correo electrónico y foto de perfil proporcionados por Google. No tenemos acceso a tu contraseña de Google ni a tus archivos personales de Google Drive o Gmail.
              </li>
              <li>
                <strong>Perfil de Candidato y CV:</strong> Información laboral, formación académica, experiencia, habilidades, currículum vitae (PDF/Word), número de teléfono/WhatsApp y departamento o localidad de residencia que decidas cargar voluntariamente.
              </li>
              <li>
                <strong>Perfil de Empresa y Ofertas de Empleo:</strong> Razón social o nombre comercial, RUT (si corresponde), descripción de la empresa, logo, datos de contacto del reclutador y detalles de las vacantes publicadas.
              </li>
              <li>
                <strong>Datos de Navegación y Técnicos:</strong> Dirección IP, tipo de navegador, registros de eventos de seguridad y cookies funcionales indispensables para mantener activa tu sesión.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">4</span>
              Uso de Datos de Usuario de Google (Google API Disclosure)
            </h2>
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-4 sm:p-5 text-sm sm:text-base text-slate-700 dark:text-slate-200 space-y-3">
              <p>
                PostulaUY ofrece a los usuarios la posibilidad de registrarse e iniciar sesión de forma ágil y segura utilizando su cuenta de Google a través del protocolo OAuth 2.0.
              </p>
              <p>
                <strong>Cumplimiento de la Política de Datos de Usuario de los Servicios de API de Google:</strong> El uso y la transferencia que realice PostulaUY a cualquier otra aplicación de la información recibida a través de las APIs de Google se apegan a la{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-600 dark:text-sky-400 underline hover:text-sky-700"
                >
                  Política de Datos de Usuario de los Servicios de la API de Google (Google API Services User Data Policy)
                </a>
                , incluidos los requisitos de <em>Uso Limitado (Limited Use)</em>.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <li>Solo solicitamos los permisos básicos imprescindibles para autenticar tu identidad (<code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded">openid</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded">email</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded">profile</code>).</li>
                <li>No vendemos ni transferimos tus datos de Google a terceros con fines publicitarios o de intermediación de datos.</li>
                <li>No utilizamos la información obtenida a través de Google para entrenar modelos de inteligencia artificial no autorizados.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">5</span>
              Finalidades del Tratamiento
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Tus datos son procesados exclusivamente para los siguientes fines:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <strong className="block text-slate-900 dark:text-white mb-1">Intermediación Laboral</strong>
                Permitir que candidatos se postulen a búsquedas activas y que las empresas evalúen perfiles para procesos de selección.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <strong className="block text-slate-900 dark:text-white mb-1">Gestión de Cuenta y Soporte</strong>
                Crear y mantener tu cuenta de usuario, restablecer accesos y atender consultas de soporte técnico.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <strong className="block text-slate-900 dark:text-white mb-1">Herramientas Asistidas e IA</strong>
                Facilitar la redacción de ofertas o recomendaciones de empleos solicitadas expresamente por el usuario a través de nuestro asistente de chat.
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <strong className="block text-slate-900 dark:text-white mb-1">Seguridad y Prevención de Fraude</strong>
                Prevenir publicaciones maliciosas, spam, suplantación de identidad y abusos en la plataforma.
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">6</span>
              Con Quién Compartimos tus Datos
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <strong>PostulaUY no vende, no alquila y no comercializa información personal con terceros.</strong> Únicamente compartimos datos en los siguientes supuestos:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <li>
                <strong>Empresas Reclutadoras:</strong> Cuando un candidato se postula activamente a una vacante o envía un mensaje de contacto directo a una empresa anunciante.
              </li>
              <li>
                <strong>Proveedores de Infraestructura Tecnológica:</strong> Utilizamos proveedores de clase mundial como Supabase (base de datos y autenticación en la nube) y Vercel (alojamiento de aplicaciones), quienes procesan información bajo estrictos estándares de confidencialidad y acuerdos de tratamiento de datos conformes al RGPD y normativas internacionales de protección de datos.
              </li>
              <li>
                <strong>Requerimientos Legales:</strong> Si fuere requerido formalmente por mandato judicial o autoridad competente conforme a la legislación vigente de la República Oriental del Uruguay.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">7</span>
              Seguridad y Almacenamiento de la Información
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Implementamos medidas técnicas y organizativas para proteger tus datos contra accesos no autorizados, pérdida, alteración o divulgación indebida:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <li>Cifrado de comunicaciones de extremo a extremo mediante certificados HTTPS / TLS 1.3.</li>
              <li>Políticas de seguridad a nivel de base de datos (Row Level Security - RLS), asegurando que cada usuario solo acceda a su propia información permitida.</li>
              <li>Contraseñas almacenadas mediante algoritmos de hash criptográfico unidireccional de alta seguridad.</li>
              <li>Copias de respaldo periódicas y monitoreo constante de disponibilidad del servicio.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">8</span>
              Tus Derechos (Acceso, Rectificación, Cancelación y Supresión)
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              De acuerdo con la <strong>Ley N° 18.331</strong>, tenés pleno derecho en todo momento a:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <strong>Derecho de Acceso:</strong> Saber qué datos personales tuyos están registrados y tratados en nuestra base de datos.
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <strong>Derecho de Rectificación:</strong> Modificar o actualizar cualquier dato erróneo, desactualizado o incompleto desde tu panel de usuario o por email.
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <strong>Derecho de Supresión / Cancelación:</strong> Solicitar la eliminación total y definitiva de tu cuenta y de tus archivos adjuntos de CV.
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <strong>Derecho de Oposición:</strong> Negarte al tratamiento de tus datos para finalidades específicas que no sean indispensables para el servicio.
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base pt-2">
              Para ejercer cualquiera de estos derechos, basta con enviar una solicitud con tu nombre y correo asociado a{' '}
              <a href="mailto:contacto@postulauy.com" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                contacto@postulauy.com
              </a>
              . Procesaremos tu solicitud de inmediato y sin costo alguno dentro de los plazos fijados por ley.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">9</span>
              Uso de Cookies
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Postulauy.com utiliza cookies técnicas y de sesión estrictamente necesarias para recordar el estado de tu sesión iniciada, tus preferencias de tema (modo oscuro/claro) y para proteger la seguridad frente a ataques CSRF. No utilizamos cookies de rastreo invasivo de terceros para elaborar perfiles publicitarios sin tu conocimiento.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">10</span>
              Retención de Datos
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Conservamos tus datos personales mientras mantengas tu cuenta activa en Postulauy.com o resulte necesario para cumplir los fines descritos. Si decidís eliminar tu cuenta, tus datos personales identificables y tu CV serán eliminados o disociados de manera irreversible, salvo que exista una obligación legal de conservación.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">11</span>
              Modificaciones a esta Política
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Podemos actualizar esta Política de Privacidad periódicamente para reflejar mejoras técnicas, nuevos servicios o adecuaciones normativas. Cuando realicemos cambios significativos, indicaremos la fecha de actualización al comienzo de este documento y, en caso de modificaciones sustanciales, publicaremos un aviso destacado en nuestro portal.
            </p>
          </section>

          {/* Section 12 - Contact Card */}
          <section className="pt-4">
            <div className="bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-800 dark:to-slate-800/60 border border-indigo-100 dark:border-slate-700 rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ¿Dudas o consultas sobre tu privacidad?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Si tenés preguntas sobre el uso de tus datos, querés solicitar la baja de tu cuenta o ejercer tus derechos de acceso o rectificación, escribinos directamente:
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                <a
                  href="mailto:contacto@postulauy.com"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  contacto@postulauy.com
                </a>
                <span className="text-slate-500 dark:text-slate-400">
                  Montevideo, Uruguay
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
