# Plantilla de importación del catálogo

En **Catálogo de activos → Importar Excel → Descargar plantilla Excel** se descarga `public/templates/plantilla-importacion-catalogo.xlsx`. Es un archivo estático incluido en el despliegue del admin; no requiere cambios ni migraciones en la API.

Se preparó a partir de `LISTADO_MAESTRO_140_ACTIVOS_ESPECIFICACIONES_SIN_REF.xlsx`, conservando solo las cuatro hojas y los encabezados que utiliza el importador. Mantiene las 54 familias de **Categorías N4**, con sus códigos como texto para conservar los ceros iniciales. Las otras tres hojas están vacías, sin activos de ejemplo que puedan importarse por accidente. No contiene fórmulas, imágenes ni vínculos externos.

## Cómo completarla

Conserva los nombres de las hojas y los encabezados de la primera fila. Introduce los datos desde la segunda fila; las tablas de Excel permiten agregar más filas.

### Listado maestro

Una fila por modelo, con estas columnas:

| Columna | Uso |
| --- | --- |
| TAG ACTIVO | Identificador del modelo. Repetir un TAG existente actualiza ese modelo. |
| Nombre | Nombre del modelo. |
| Código CA | Identificador de familia, presente en Categorías N4. Incluye una lista desplegable de los códigos originales. |
| Categoría N4 | Encabezado requerido por el importador. El nombre canónico de la familia se obtiene de Categorías N4 mediante Código CA. |
| Tipo | Tipo de activo dentro de la familia. |
| Fabricante / modelo | Nombre del fabricante. Se eliminan las notas entre paréntesis; usa Pendiente si se desconoce. |
| Denominación de etapa | Nombre de una etapa existente en el sistema, tal como aparece en Etapas y redes. No uses el código D01/E01 en lugar del nombre. |

### Categorías N4

Contiene **Código CA** y **Categoría N4**. Puedes agregar familias o modificar sus nombres, manteniendo códigos únicos. Para nuevas familias usa códigos de 1 a 20 letras mayúsculas, números o guion bajo. Las familias se crean o actualizan por Código CA y solo se importan las utilizadas en Listado maestro. Si agregas códigos, amplía la lista desplegable de Excel o pégalos directamente en el listado.

### Características

Contiene **TAG ACTIVO** y **Componentes principales**. Debe existir una fila por cada TAG del listado, incluso cuando el componente esté vacío. El texto completo de componentes se guarda como un solo elemento.

### Especificaciones

Contiene **TAG ACTIVO**, **Parámetro técnico**, **Unidad** y **Valor / estado**. Usa una fila por especificación, repitiendo el TAG correspondiente. Puedes dejar Unidad vacía si no aplica. Parámetro técnico y Valor / estado son obligatorios en las filas que agregues. No repitas la misma combinación de parámetro y unidad para un mismo TAG.

Si un modelo no tiene especificaciones, no agregues filas para él en esta hoja. Después de analizar el archivo, marca **Importar también los modelos sin especificaciones técnicas**. La hoja y sus encabezados deben mantenerse aunque todos los modelos carezcan de especificaciones.

## Antes de importar

Selecciona las redes transversales en el diálogo del admin: no se leen del archivo. Analiza el Excel y revisa las altas y actualizaciones. La carga admite hasta 5 MB y 2.000 modelos. Las especificaciones, componentes y redes de los TAG incluidos reemplazan los datos anteriores; se conservan sus fotos.

## Mantenimiento

La plantilla debe mantener los encabezados definidos en `apps/api/src/modules/catalog/catalog-import.xlsx.ts` del repositorio de la API. Si cambia ese contrato, actualiza también el archivo descargable y comprueba que un libro rellenado pueda pasar por `parseMasterWorkbook`.
