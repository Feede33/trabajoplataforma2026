import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, ArrowLeft, CheckCircle2, Shield, AlertTriangle, Scale, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones de Uso | Postulauy.com',
  description: 'Términos y condiciones del servicio de Postulauy.com. Conocé las reglas, derechos y responsabilidades al utilizar nuestra plataforma de empleo en Uruguay.',
  alternates: {
    canonical: 'https://postulauy.com/terms-of-service',
  },
}

export default function TermsOfServicePage() {
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
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Términos Legales
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Términos y Condiciones del Servicio
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            Bienvenido a <span className="font-semibold text-slate-900 dark:text-white">Postulauy.com</span>. Te pedimos que leas detenidamente estos Términos y Condiciones antes de utilizar nuestros servicios de intermediación laboral y vinculación profesional en Uruguay.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 gap-2">
            <span>Última actualización: <strong>{lastUpdated}</strong></span>
            <span>Jurisdicción: <strong>República Oriental del Uruguay</strong></span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">1</span>
              Aceptación de los Términos
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Al acceder, navegar o registrarte en el sitio web <strong className="text-slate-900 dark:text-white">https://postulauy.com</strong> (en adelante, la "Plataforma"), aceptás expresamente quedar sujeto a estos Términos y Condiciones, así como a nuestra{' '}
              <Link href="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Política de Privacidad
              </Link>
              . Si no estás de acuerdo con alguna de estas disposiciones, te solicitamos abstenerte de utilizar la Plataforma.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">2</span>
              Naturaleza del Servicio
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Postulauy.com es una plataforma tecnológica orientada a:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <li>Facilitar a los <strong>candidatos</strong> la búsqueda y postulación a oportunidades laborales y oficios en el territorio uruguayo.</li>
              <li>Permitir a las <strong>empresas y empleadores</strong> publicar vacantes, recibir currículums y gestionar postulaciones.</li>
              <li>Poner a disposición herramientas de asistencia basadas en inteligencia artificial para la redacción de vacantes o asistencia de búsqueda laboral.</li>
            </ul>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic">
              Aclaración: Postulauy.com actúa como intermediario tecnológico. No es una agencia de contratación, ni interviene en la relación laboral directa o contractual entre empleadores y trabajadores.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">3</span>
              Registro y Seguridad de las Cuentas
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Para acceder a ciertas funciones (postularse, publicar avisos, guardar empleos), el usuario debe crear una cuenta mediante correo electrónico y contraseña o mediante autenticación federada con Google OAuth.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <li>El usuario se compromete a proporcionar información veraz, exacta y actualizada en su perfil o currículum vitae.</li>
              <li>Es responsabilidad exclusiva del usuario preservar la confidencialidad de sus credenciales de acceso.</li>
              <li>PostulaUY se reserva el derecho de suspender o dar de baja cuentas que utilicen datos falsos o suplanten la identidad de terceros.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">4</span>
              Reglas de Uso y Conducta Prohibida
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Queda expresamente prohibido en la Plataforma:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
                <strong className="block text-rose-700 dark:text-rose-400 mb-1">Ofertas Fraudulentas o Ilícitas</strong>
                Publicar ofertas que soliciten dinero a los candidatos, esquemas piramidales o actividades contrarias a la ley.
              </div>
              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
                <strong className="block text-rose-700 dark:text-rose-400 mb-1">Discriminación</strong>
                Publicaciones con contenido discriminatorio por razones de género, raza, orientación sexual, religión o discapacidad.
              </div>
              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
                <strong className="block text-rose-700 dark:text-rose-400 mb-1">Extracción Masiva (Scraping)</strong>
                Utilizar bots o software automatizado para extraer datos masivos sin autorización explícita por escrito.
              </div>
              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
                <strong className="block text-rose-700 dark:text-rose-400 mb-1">Spam o Abuso</strong>
                Enviar mensajes no solicitados o cargar archivos con código malicioso o vulnerabilidades.
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">5</span>
              Planes, Pagos y Facturación
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              PostulaUY ofrece servicios gratuitos y opciones de planes premium o avisos destacados para empresas.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              <li>Los precios se encuentran expresados en Pesos Uruguayos (UYU) y/o Dólares Estadounidenses (USD), detallando los impuestos aplicables.</li>
              <li>Las transacciones de pago son procesadas de manera segura a través de pasarelas homologadas (como Mercado Pago), sin que Postulauy.com almacene los datos sensibles de tarjetas de crédito.</li>
              <li>Los avisos destacados se activan inmediatamente una vez confirmado el pago por el procesador.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">6</span>
              Herramientas de Inteligencia Artificial
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              La Plataforma pone a disposición funciones asistidas por IA (como el asistente de chat y sugerencias de vacantes). Los usuarios reconocen que los resultados generados por IA son de carácter orientativo y deben ser revisados por el usuario antes de su publicación o postulación definitiva.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">7</span>
              Propiedad Intelectual
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              El diseño del sitio web, código fuente, logotipos, marcas comerciales y elementos gráficos de Postulauy.com son propiedad exclusiva de sus creadores y están protegidos por las leyes de propiedad intelectual y derechos de autor vigentes en Uruguay y convenios internacionales.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">8</span>
              Limitación de Responsabilidad
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Postulauy.com no garantiza la contratación efectiva de ningún candidato ni la idoneidad absoluta de las personas postuladas. La selección, contratación y cumplimiento de las leyes de seguridad social y laboral de la República Oriental del Uruguay son responsabilidad exclusiva de las partes empleadoras y candidatas.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm">9</span>
              Ley Aplicable y Jurisdicción
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Estos Términos y Condiciones se rigen e interpretan conforme a las leyes de la <strong>República Oriental del Uruguay</strong>. En caso de surgir cualquier controversia judicial relativa a su validez, interpretación o cumplimiento, las partes se someten a la competencia de los Tribunales Ordinarios de la ciudad de Montevideo, Uruguay.
            </p>
          </section>

          {/* Section 10 - Contact */}
          <section className="pt-4">
            <div className="bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-800 dark:to-slate-800/60 border border-indigo-100 dark:border-slate-700 rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Contacto Legal
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Si tenés alguna consulta respecto a estos Términos y Condiciones o deseás reportar un aviso sospechoso, comunicate con nuestro equipo:
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
