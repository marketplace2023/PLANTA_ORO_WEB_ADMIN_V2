# Panel de Administración · Ecosistema FUR

Panel del **administrador del ecosistema**. Mismo layout y diseño que el panel de planta (`../planta_beneficio_oro_panel`):
barra lateral navy, KPIs, tablas y estados con icono + texto + color (`docs/design.md`).
Solo entra quien tiene `isGlobalAdmin`; cualquier otra cuenta ve "Acceso restringido".

## Pantallas

| Sección | Qué hace |
|---|---|
| Resumen | KPIs del ecosistema, plantas por estado y visibilidad, estado del sistema, actividad reciente |
| Plantas | Listado con filtros; **crear** planta; detalle con **editar**, **miembros y roles** (asignar/quitar), **etapas** y **redes** (habilitar, publicar) |
| Proveedores y contratistas | **Aprobar** solicitudes de registro (y verificar), suspender y reactivar, calificar (0–5), editar razón social / NIF / país, **asignar responsables** y crear empresas ya activas |
| Catálogo de activos | Alta y edición de **modelos, tipos, familias y fabricantes** |
| Etapas y redes | Etapas D01–D19 (solo lectura) y **redes transversales FUR-… con alta, edición y eliminación**: código fijo, nombre, color (paleta de los portales), ícono y descripción. Cada tarjeta muestra en cuántas plantas y tipos se usa; eliminar una red en uso pide confirmar y la quita de esas plantas y tipos |
| Actividad y auditoría | Eventos recientes de auditoría |

**Pendiente (requiere endpoints nuevos en la API):** listado global de usuarios, matriz de roles y permisos, e historial completo de auditoría con filtros.

## Registro y aprobaciones

El panel de administración **no tiene registro público**: solo entran administradores del ecosistema. Desde aquí se aprueba lo que piden los demás portales: empresas proveedoras y contratistas (*Proveedores y contratistas*) y accesos a plantas (*Solicitudes de acceso*: aprobar eligiendo el rol, o rechazar). El resumen avisa de lo pendiente.

## Ejecutar

```bash
# En ../planta_beneficio_oro
npm run db:local        # Postgres local
npm run dev:api         # API en :3000

# En esta carpeta
npm install
npm run dev             # http://localhost:5176
```

En desarrollo, Vite reenvía `/api` a `http://localhost:3000` (ver `vite.config.ts`), así que **no hay que configurar CORS**.
En producción define `VITE_API_URL` con la URL absoluta de la API.

Usuario de demo: `admin@fur.local` / `fur-local-2026`.

Verificación: `npm run lint && npm test && npm run build`.
