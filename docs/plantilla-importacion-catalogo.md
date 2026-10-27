# Plantilla de importación del catálogo

En **Catálogo de activos → Importar Excel → Descargar plantilla Excel** se descarga `public/templates/plantilla-importacion-catalogo.xlsx`. Es un archivo estático incluido en el despliegue del admin. La lectura de varios componentes y fabricantes de referencia requiere desplegar la API actualizada antes o junto con el admin y utiliza datos JSON existentes. La identidad del modelo por tipo, fabricante, nombre y etapa requiere la migración de API `0034_model_stage_identity.sql`; `start:prod` la ejecuta al arrancar.

La plantilla tiene seis hojas: **Instrucciones**, **Listado maestro**, **Categorías N4**, **Características**, **Especificaciones** y **Fabricantes de referencia**. Mantiene las 54 familias del listado original, con sus códigos como texto para conservar los ceros iniciales. Las hojas de carga están vacías, sin activos de ejemplo que puedan importarse por accidente. Los ejemplos están únicamente en Instrucciones y el importador los ignora. No contiene fórmulas, imágenes ni vínculos a otros libros.

## Cómo completarla

Empieza por Instrucciones: explica los campos y muestra un ejemplo con dos especificaciones, dos componentes y dos fabricantes asociados al mismo TAG. Conserva los nombres de las hojas de datos y sus encabezados de la primera fila. Introduce los datos desde la segunda fila; las tablas de Excel permiten agregar más filas.

### Listado maestro

Una fila por modelo, con estas columnas:

| Columna | Uso |
| --- | --- |
| TAG ACTIVO | Identificador del modelo. Repetir un TAG existente actualiza ese modelo. |
| Nombre | Nombre del modelo. Puede coincidir con otro del mismo tipo y fabricante si sus etapas son distintas. |
| Código CA | Identificador de familia, presente en Categorías N4. Incluye una lista desplegable de los códigos originales. |
| Categoría N4 | Encabezado requerido por el importador. El nombre canónico de la familia se obtiene de Categorías N4 mediante Código CA. |
| Tipo | Tipo de activo dentro de la familia. |
| Fabricante / modelo | Nombre del fabricante. Se eliminan las notas entre paréntesis; usa Pendiente si se desconoce. |
| Denominación de etapa | Nombre de una etapa existente en el sistema, tal como aparece en Etapas y redes. No uses el código D01/E01 en lugar del nombre. |

### Categorías N4

Contiene **Código CA** y **Categoría N4**. Puedes agregar familias o modificar sus nombres, manteniendo códigos únicos. Para nuevas familias usa códigos de 1 a 20 letras mayúsculas, números o guion bajo. Las familias se crean o actualizan por Código CA y solo se importan las utilizadas en Listado maestro. Si agregas códigos, amplía la lista desplegable de Excel o pégalos directamente en el listado.

### Características

Contiene **TAG ACTIVO** y **Componentes principales**. Cada fila es un componente; repite el TAG para asociar varios componentes al mismo modelo. Se conserva el orden de las filas y el texto de cada componente no se divide por comas ni puntos. Puedes omitir las filas de modelos sin componentes y se guardarán con una lista vacía. Las filas antiguas con solo el TAG y sin texto también representan una lista vacía. La hoja y sus encabezados se mantienen aunque no haya componentes.

### Especificaciones

Contiene **TAG ACTIVO**, **Parámetro técnico**, **Unidad** y **Valor / estado**. Usa una fila por especificación, repitiendo el TAG correspondiente. Puedes dejar Unidad vacía si no aplica. Parámetro técnico y Valor / estado son obligatorios en las filas que agregues. No repitas la misma combinación de parámetro y unidad para un mismo TAG.

Si un modelo no tiene especificaciones, no agregues filas para él en esta hoja. Después de analizar el archivo, marca **Importar también los modelos sin especificaciones técnicas**. La hoja y sus encabezados deben mantenerse aunque todos los modelos carezcan de especificaciones.

### Fabricantes de referencia

Contiene **TAG ACTIVO**, **Fabricante**, **Descripción** y **Sitio web**. Cada fila asocia una referencia a un modelo. Repite el TAG para agregar varios fabricantes. El nombre es obligatorio y admite hasta 160 caracteres; la descripción es opcional y admite hasta 2.000 caracteres. La web es opcional y debe ser una dirección completa `http://` o `https://` de hasta 2.048 caracteres. No se infieren datos del fabricante asignado en Listado maestro.

Se guardan en `technicalData.fabricantesReferencia` como nombre, alcance y sitio web. La ficha muestra las referencias con su descripción y enlace; las cards del catálogo muestran los nombres separados por coma.

Si la hoja está presente, sus filas reemplazan las referencias de todos los TAG incluidos en Listado maestro. Un TAG sin filas queda sin referencias. Para vaciar las referencias de todos esos modelos, conserva la hoja con sus encabezados y sin datos. Las referencias de modelos fuera del archivo no se modifican.

Los archivos anteriores que no tienen esta hoja siguen siendo válidos y conservan las referencias actuales. Si la hoja está presente, sus cuatro encabezados son obligatorios, incluso si todas sus filas están vacías.

## Antes de importar

Selecciona las redes transversales en el diálogo del admin: no se leen del archivo. Analiza el Excel y revisa las altas y actualizaciones. Abre **Ver componentes, especificaciones y fabricantes** para revisar todos los datos de cada TAG y si se conservarán o vaciarán sus referencias. La carga admite hasta 5 MB, 2.000 modelos y 25.000 filas por hoja de datos. Los TAG de componentes, especificaciones y referencias deben aparecer en Listado maestro. Las especificaciones, componentes y redes de los TAG incluidos reemplazan los datos anteriores; se conservan sus fotos.

Se permite que dos TAG compartan tipo, fabricante y nombre cuando pertenecen a etapas diferentes. Si comparten también una etapa efectiva, se bloquea la importación e indica las filas reales, ambos TAG y la etapa del conflicto. El TAG sigue siendo único en todo el catálogo y repetirlo actualiza su modelo, incluso si cambia de etapa.

## Mantenimiento

La plantilla debe mantener los encabezados definidos en `apps/api/src/modules/catalog/catalog-import.xlsx.ts` del repositorio de la API. Si cambia ese contrato, actualiza también el archivo descargable y comprueba que un libro rellenado pueda pasar por `parseMasterWorkbook`.
