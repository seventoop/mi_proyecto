# Auditoría: Unificación de Paneles (Inversor & Cliente)

Este documento detalla el estado actual de los paneles de usuario y establece la hoja de ruta para su unificación en un **Panel de Usuario Único**.

## 1. Estado de Situación Actual

| Componente | Panel Inversor (`/dashboard/inversor`) | Panel Cliente (`/dashboard/cliente`) |
| :--- | :--- | :--- |
| **Estado General** | **FUNCIONAL** | **PARCIAL / ROTO** |
| **Acceso Sidebar** | Apunta a `/inversor` | Apunta a `/inversor` (ERROR) |
| **Gate de Seguridad** | Solo `INVERSOR` o `ADMIN` | Libre (pero incompleto) |
| **Página Principal** | Dashboard financiero completo | Listado simple de unidades |
| **Detalle Item** | Integrado en Dashboard | **ROTO** (Ruta inexistente) |
| **Modelos Prisma** | `Inversion`, `Pago`, `Milestone` | `Unidad`, `Manzana`, `Etapa` |

### 🚨 Hallazgos Críticos
1. **Redirect Loop del Cliente**: El sidebar envía al `CLIENTE` a la ruta de inversor, la cual lo rechaza por falta de rol, devolviéndolo al dashboard raíz. El cliente no puede ver sus propiedades desde el menú lateral.
2. **Deuda Técnica KYC**: El archivo `lib/actions/kyc-actions.ts` referencia un modelo `KycProfile` que fue eliminado o nunca creado en `schema.prisma`. Esto rompe el flujo de verificación de desarrolladores.
3. **Fragmentación de Activos**: Un "Cliente" es esencialmente un inversor de una unidad física (100% de los m2 de un lote). Mantenerlos separados duplica lógica de pagos, documentos y seguimiento.

---

## 2. Mapa de Overlap y Modelos

### Modelos Compartidos
- **`User`**: Ambos dependen de `kycStatus`, `saldo` y `documentacion`.
- **`Proyecto`**: Ambos visualizan información del desarrollo, ubicación e imágenes.
- **`Documentacion`**: Ambos suben archivos (DNI, comprobantes) para validación.

### Diferencias de Implementación
- **Inversor**: Compra `m2` genéricos (Participación financiera).
- **Cliente**: Compra una `Unidad` específica (Lote físico).

---

## 3. Hoja de Ruta para Unificación (STP-UNIFIED-PANEL-V1)

### Fase 1: Corrección de Bloqueos (Inmediato)
1. **Sidebar**: Corregir `components/dashboard/sidebar.tsx` para que detecte el rol y envíe a la ruta correcta o, preferiblemente, a la nueva ruta unificada `/dashboard/mi-portafolio`.
2. **Cleanup KYC**: Eliminar referencias a `KycProfile` y centralizar en `lib/actions/kyc.ts` usando el modelo `User`.

### Fase 2: El Panel Unificado (`/dashboard/portafolio`)
- Crear una vista única con dos pestañas:
  - **Activos Físicos**: Listado de Unidades (Ex-Panel Cliente).
  - **Inversiones m2**: Portafolio financiero (Ex-Panel Inversor).
- **Marketplace Unificado**: Permitir que el "Cliente" vea oportunidades de inversión mayorista para escalar su perfil a "Inversor".

### Fase 3: Flujo KYC Evolutivo
- **Nivel 1 (Cliente)**: DNI frente/dorso (Habilita reserva de lotes).
- **Nivel 2 (Inversor)**: Prueba de fondos (Habilita compra de m2).

---

## 4. Análisis de Riesgos
- **Permisos de API**: Las rutas de `/api/reservas` y `/api/pagos` deben actualizarse para validar que un `CLIENTE` solo acceda a lo vinculado a su `responsableId`.
- **Migración de Rutas**: Los links actuales en correos y notificaciones hacia `/dashboard/cliente` deben tener un fallback o ser actualizados.

---

## 5. Veredicto Técnico
**REUTILIZAR**: La UI del panel Inversor (es muy superior).
**MERGE**: Las acciones de servidor de KYC.
**CONSTRUIR**: La página de detalle de unidad faltante para el cliente.
