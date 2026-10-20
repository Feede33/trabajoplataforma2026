# 🚀 EmpleosYa — Plataforma de Empleos y Profesionales

Plataforma moderna de publicación de empleos y postulaciones construida con **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Bun** y **Supabase** (PostgreSQL + Auth + Storage).

---

## 🌟 Características Principales

### 🏢 Para Empresas
- **Publicación de empleos:** Formulario completo con título, rubro, modalidad (presencial/remoto/híbrido), tipo de contrato, rango salarial, tags y descripción.
- **Panel de control (Dashboard):** Métricas de avisos activos, postulaciones recibidas y candidatos en revisión.
- **Gestión de avisos:** Pausar, cerrar o reactivar vacantes en 1 clic.
- **Bandeja de postulantes:** Ver postulantes por empleo, acceder a sus cartas de presentación, descargar/visualizar sus CVs en PDF y actualizar el estado de cada candidato (`pendiente`, `visto`, `entrevista`, `rechazado`).

### 👤 Para Candidatos
- **Buscador y filtros avanzados:** Filtrar por puesto, rubro, ubicación (ciudad o remoto) y tipo de contrato.
- **Postulación inmediata:** Formulario modal para postularse con carta de presentación personalizada y adjunto de CV.
- **Perfil profesional y CV:** Editor de perfil con nombre, biografía, links (LinkedIn, portafolio) y carga de CV en PDF.
- **Historial de postulaciones:** Seguimiento con estados en tiempo real y explicaciones paso a paso de cada etapa.

### ⚡ Modo Demo Inmediato & Conexión Supabase
- **Modo Demo / Local:** La plataforma funciona al 100% desde el primer segundo sin necesidad de configurar claves ni base de datos previa, guardando los datos en `localStorage`. Cuenta con botones de acceso rápido para probar como Empresa y Candidato.
- **Supabase Ready:** En cuanto agregues tus claves de Supabase en `.env.local` y ejecutes el script SQL, la app se conectará automáticamente a tu base de datos PostgreSQL y Supabase Auth.

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Runtime & Gestor de paquetes:** Bun
- **Base de datos & Auth:** Supabase (PostgreSQL, Row Level Security, Storage)

---

## 🚀 Cómo Iniciar el Proyecto

1. Abrí una terminal en la carpeta del proyecto:
   ```bash
   cd C:\Users\Federico\Downloads\jobboard
   ```

2. Iniciá el servidor de desarrollo:
   ```bash
   bun dev
   ```

3. Abrí tu navegador en:
   ```
   http://localhost:3000
   ```

---

## 🗄️ Conexión con Supabase (Paso a Paso)

1. Creá un nuevo proyecto en [Supabase](https://supabase.com).
2. Andá a **Project Settings > API** y copiá la **URL** y la **anon key**.
3. Abrí el archivo `.env.local` en la raíz del proyecto y reemplazá los valores:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```
4. Andá al **SQL Editor** en Supabase, abrí el archivo:
   `supabase/migrations/001_init.sql`
   Pegá el contenido y dale **Run**.
5. ¡Listo! La plataforma detectará la conexión con Supabase automáticamente (verás el indicador verde en la barra superior).

---

## 📁 Estructura del Proyecto

```
jobboard/
├── app/
│   ├── page.tsx                     # Landing page principal
│   ├── layout.tsx                   # Layout global con AuthProvider, Navbar y Footer
│   ├── globals.css                  # Estilos globales y Tailwind
│   ├── empleos/
│   │   ├── page.tsx                 # Catálogo y buscador con filtros
│   │   └── [slug]/page.tsx          # Detalle del empleo + botón Postularme
│   ├── auth/
│   │   ├── login/page.tsx           # Login con acceso rápido Demo
│   │   └── registro/page.tsx        # Registro dual (Empresa / Candidato)
│   ├── empresa/
│   │   ├── dashboard/page.tsx       # Panel de métricas y empleos de la empresa
│   │   ├── publicar/page.tsx        # Formulario para publicar nueva vacante
│   │   └── postulaciones/page.tsx   # Gestión de candidatos y CVs
│   └── candidato/
│       ├── dashboard/page.tsx       # Panel de control del candidato
│       ├── perfil/page.tsx          # Perfil profesional y carga de CV en PDF
│       └── postulaciones/page.tsx   # Seguimiento del estado de aplicaciones
├── components/
│   ├── layout/                      # Navbar y Footer
│   ├── jobs/                        # JobCard, JobFilters, ApplyModal
│   └── ui/                          # Badge, toasts y utilidades UI
├── lib/
│   ├── context/AuthContext.tsx      # Contexto global de autenticación
│   ├── supabase/                    # Clientes de Supabase y tipos TypeScript
│   ├── mock-data.ts                 # Datos iniciales realistas
│   ├── data.ts                      # Capa de datos (Supabase + fallback local)
│   └── utils.ts                     # Funciones de formato y constantes
└── supabase/
    └── migrations/001_init.sql      # Script de base de datos PostgreSQL completo
```
