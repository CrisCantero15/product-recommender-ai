# AI Product Recommendation Engine

Sistema inteligente de búsqueda y recomendación para e-commerce basado en Inteligencia Artificial.

El objetivo del proyecto es permitir que un usuario consulte un catálogo utilizando lenguaje natural, obteniendo resultados relevantes mediante una combinación de:

- Comprensión del lenguaje natural (LLM)
- Extracción automática de filtros
- Búsqueda vectorial con ChromaDB
- Embeddings
- Re-ranking mediante reglas de negocio
- Generación conversacional de respuestas

---

# Arquitectura

```text
Usuario
      │
      ▼
Mensaje en lenguaje natural
      │
      ▼
LLM (Intent Analyzer)
      │
      ├──────────────► Extracción de filtros
      │
      ├──────────────► Semantic Query
      │
      └──────────────► Pending Products
                              │
                              ▼
                  Embedding de la consulta
                              │
                              ▼
                     ChromaDB + Filtros
                              │
                              ▼
                    Búsqueda vectorial
                              │
                              ▼
                     Re-ranking
                              │
                              ▼
          Construcción del JSON final
(message + products + pending_products)
                              │
                              ▼
                         Frontend
                              │
                              ▼
¿Existen productos pendientes?
        │
   Sí ──┴── No
        │
        ▼
Solicitar confirmación al usuario
        │
        ▼
Nueva consulta utilizando el
siguiente elemento de pending_products
```

---

# Flujo completo

## 1. Comprensión de la intención

El usuario puede escribir cualquier consulta en lenguaje natural.

Ejemplo:

> Busco un vino afrutado para regalar a mi padre por menos de 25€.

Un agente basado en GPT interpreta el mensaje y genera un JSON estructurado.

El modelo **no busca productos**.

Su única función consiste en comprender la intención del usuario.

La salida contiene:

- validación de la petición
- filtros
- atributos
- ocasión
- destinatario
- semantic query
- productos pendientes
- mensaje inicial

Ejemplo:

```json
{
  ...
}
```

---

# 2. Filtrado inicial mediante ChromaDB

Una vez que el LLM ha interpretado la intención del usuario y ha generado el objeto JSON estructurado, se realiza una primera consulta sobre **ChromaDB**, que actúa como base de datos vectorial del sistema.

En esta fase todavía **no se realiza ninguna búsqueda semántica**. El objetivo consiste en eliminar todos aquellos productos que claramente no cumplen los requisitos indicados por el usuario mediante filtros estructurados.

Entre los filtros que pueden aplicarse se encuentran:

- Categoría
- Precio mínimo y máximo
- Formato
- Disponibilidad (stock)
- Graduación alcohólica
- Denominación de origen
- Añada
- Cualquier otro metadato estructurado disponible

Gracias a este filtrado previo se reduce considerablemente el número de productos candidatos.

### Ejemplo

Catálogo inicial:

```
20.000 productos
```

Tras aplicar los filtros:

```
Categoría  →  400 productos
Precio     →  120 productos
Stock      →   95 productos
```

Únicamente esos **95 productos** continuarán hacia la fase de búsqueda semántica.

---

# 3. Recuperación semántica mediante ChromaDB

Una vez filtrados los productos candidatos, comienza la búsqueda semántica.

Cada producto del catálogo dispone previamente de un **embedding**, almacenado dentro de ChromaDB.

Los embeddings representan matemáticamente el significado del producto, permitiendo comparar conceptos y no únicamente palabras.

## Información utilizada para generar el embedding

Cada embedding puede construirse utilizando información como:

- Nombre
- Descripción
- Categoría
- Marca
- Atributos
- Notas de cata
- Maridajes
- Etiquetas
- Información comercial relevante

Los datos dinámicos como:

- Precio
- Stock

no forman parte del embedding, ya que cambian constantemente.

En su lugar se almacenan como **metadatos**, permitiendo filtrar productos sin necesidad de regenerar sus vectores.

---

## 3.1 Generación de embeddings de productos

Para obtener embeddings de mayor calidad, el sistema no convierte directamente los datos de la base de datos en vectores.

En primer lugar, un LLM genera una descripción semántica optimizada del producto utilizando toda la información disponible.

Por ejemplo, si un producto únicamente contiene:

- Nombre
- Marca
- Referencia
- Formato
- Unidades por caja

el LLM puede enriquecer esa información incorporando conceptos como:

- Tipo de producto
- Categoría
- Perfil de sabor
- Uso recomendado
- Contexto de consumo
- Canal de venta
- Público objetivo

A continuación, esa descripción enriquecida se envía al modelo de embeddings.

El flujo completo es el siguiente:

```
Datos del producto
        │
        ▼
LLM genera una descripción semántica
        │
        ▼
Modelo de Embeddings
        │
        ▼
Vector numérico
        │
        ▼
ChromaDB
```

Este enfoque ofrece múltiples ventajas:

- Embeddings más ricos y descriptivos.
- Mayor contexto semántico.
- Mejor recuperación de productos con descripciones pobres.
- Separación entre información dinámica y semántica.
- Posibilidad de regenerar embeddings únicamente cuando cambian los datos relevantes.

---

## 3.2 Embedding de la consulta del usuario

La consulta semántica (`semantic_query`) generada por el LLM también se transforma en un embedding utilizando el mismo modelo empleado para los productos.

Por ejemplo:

```
vino afrutado con notas de fruta roja ideal para regalo
```

↓

```
Embedding
```

↓

```
[0.182, -0.731, 0.405, ...]
```

Al compartir el mismo espacio vectorial que los productos almacenados en ChromaDB, la similitud puede calcularse de forma directa.

---

## 3.3 Búsqueda vectorial

Una vez obtenido el embedding de la consulta, ChromaDB calcula la similitud vectorial entre dicho embedding y los embeddings de todos los productos que superaron el filtrado inicial.

Como resultado se obtiene una lista ordenada según la cercanía semántica.

Este mecanismo permite recuperar productos aunque el usuario utilice palabras completamente distintas a las presentes en el catálogo.

Por ejemplo, un usuario podría buscar:

> "vino elegante para regalar"

y obtener vinos cuya descripción nunca contiene literalmente la palabra *elegante*, pero sí conceptos relacionados como:

- Crianza
- Reserva
- Premium
- Notas complejas
- Presentación cuidada

La búsqueda deja de depender de coincidencias literales y pasa a basarse en el significado.

---

# 4. Re-ranking mediante reglas de negocio

La búsqueda vectorial devuelve los productos más similares desde un punto de vista semántico.

Sin embargo, el orden definitivo puede ajustarse mediante reglas propias del negocio.

Algunos ejemplos son:

- Priorizar productos con stock.
- Promocionar productos en oferta.
- Favorecer lanzamientos recientes.
- Dar mayor peso a productos con mayor margen.
- Impulsar marcas estratégicas.
- Aplicar reglas comerciales específicas.

El ranking final puede calcularse mediante una combinación ponderada entre:

- Similitud semántica.
- Popularidad.
- Disponibilidad.
- Promociones.
- Márgenes.
- Otras métricas internas.

Los pesos pueden ajustarse posteriormente durante el entrenamiento y validación del sistema.

---

# 5. Generación de la respuesta

Una vez obtenido el ranking definitivo de productos, el backend construye la respuesta que será enviada al frontend.

Para ello combina la información obtenida durante las fases anteriores:

- El mensaje (`output_message`) generado por el LLM durante el análisis de intención.
- Los identificadores de los productos recuperados tras la búsqueda semántica y el re-ranking.
- El array `pending_products`, cuando la consulta original contiene varios productos.

El resultado es un objeto JSON similar al siguiente:

```json
{
    "message": "Aquí tienes los vinos que mejor encajan con tu búsqueda:",
    "products": [
        73,
        41,
        18,
        15
    ],
    "pending_products": [
        "detergente lavavajillas industrial"
    ]
}
```

Cuando el usuario realiza una consulta sobre un único producto, `pending_products` será un array vacío.

En cambio, si la petición hace referencia a varios productos independientes, el sistema únicamente procesa el primero. Los restantes se almacenan en `pending_products` para poder ser consultados posteriormente.

El frontend informa al usuario de que existen productos pendientes y, previa confirmación, inicia automáticamente una nueva consulta utilizando el siguiente elemento del array, manteniendo así una conversación ordenada sin mezclar resultados de distintos productos.

En esta fase no se realiza ninguna llamada adicional a un LLM; el backend únicamente construye la respuesta final utilizando la información obtenida durante las etapas anteriores.

---

# 6. Actualización del frontend

El frontend recibe el objeto JSON generado por el backend.

A continuación, JavaScript utiliza el listado de identificadores de producto para solicitar su información al backend y actualizar dinámicamente el catálogo mostrado al usuario.

De este modo:

- No es necesario recargar la página.
- La conversación y el listado de productos permanecen sincronizados.
- El usuario recibe una experiencia completamente conversacional.

---

# Flujo completo del sistema

```text
Usuario
      │
      ▼
Mensaje en lenguaje natural
      │
      ▼
LLM (Intent Analyzer)
      │
      ├──────────────► Extracción de filtros
      │
      ├──────────────► Semantic Query
      │
      └──────────────► Pending Products
                              │
                              ▼
                  Embedding de la consulta
                              │
                              ▼
                     ChromaDB + Filtros
                              │
                              ▼
                    Búsqueda vectorial
                              │
                              ▼
                     Re-ranking
                              │
                              ▼
          Construcción del JSON final
(message + products + pending_products)
                              │
                              ▼
                         Frontend
                              │
                              ▼
¿Existen productos pendientes?
        │
   Sí ──┴── No
        │
        ▼
Solicitar confirmación al usuario
        │
        ▼
Nueva consulta utilizando el
siguiente elemento de pending_products
```

---

# Ejemplo end-to-end

### Consulta del usuario

> Busco un vino afrutado para cenar este fin de semana.

### Paso 1

El LLM interpreta la intención.

```json
{
    "filters": {
        "category": "vino"
    },
    "semantic_query": "vino afrutado para una cena de fin de semana"
}
```

Obsérvese que *"este fin de semana"* no constituye un filtro estructurado, sino parte del contexto semántico.

### Paso 2

La consulta semántica se transforma en un embedding.

```
vino afrutado para una cena de fin de semana
```

↓

```
[0.213, -0.184, 0.902, ...]
```

### Paso 3

ChromaDB compara dicho embedding con los embeddings almacenados.

Resultado:

| Producto | Similaridad |
|----------|------------:|
| Rioja Crianza | 0.96 |
| Ribera Joven | 0.94 |
| Blanco Verdejo | 0.92 |
| Rosado | 0.89 |

### Paso 4

Se aplican las reglas de negocio.

Por ejemplo:

- Stock
- Promociones
- Popularidad
- Margen
- Productos destacados

El ranking puede modificarse respecto al obtenido únicamente mediante similitud semántica.

### Paso 5

El backend construye la respuesta final utilizando:

- El mensaje (`output_message`) generado previamente por el LLM durante el análisis de intención.
- El listado de productos obtenido tras la búsqueda semántica y el re-ranking.

El resultado es un objeto JSON como el siguiente:

```json
{
    "message": "Aquí tienes los vinos que mejor encajan con tu búsqueda:",
    "products": [
        73,
        41,
        18,
        15
    ]
}
```

El campo `message` sirve como introducción a los resultados y mantiene un tono coherente con la consulta realizada por el usuario.

El array `products` contiene los identificadores de los productos seleccionados, que posteriormente serán utilizados por el frontend para recuperar toda su información y actualizar dinámicamente el catálogo mostrado.

En esta fase no se realiza ninguna llamada adicional a un LLM; el backend únicamente construye la respuesta final combinando el mensaje generado inicialmente con los productos recuperados.

---

## Ejemplo de consulta multiproducto

### Usuario

> Necesito agua mineral y también detergente lavavajillas industrial.

### Paso 1

El LLM detecta que existen dos productos independientes.

Únicamente analiza el primero y almacena el resto en `pending_products`.

```json
{
    "filters": {
        "category": "Agua"
    },
    "semantic_query": "agua mineral para hostelería",
    "pending_products": [
        "detergente lavavajillas industrial"
    ]
}
```

### Paso 2

El sistema recupera únicamente los productos correspondientes a agua mineral.

### Paso 3

El backend devuelve:

```json
{
    "message": "Estos son los resultados para agua mineral:",
    "products": [
        18,
        45,
        91
    ],
    "pending_products": [
        "detergente lavavajillas industrial"
    ]
}
```

### Paso 4

El frontend informa al usuario de que todavía queda una consulta pendiente.

Si el usuario acepta continuar, se lanza automáticamente una nueva petición utilizando el siguiente elemento de `pending_products`, iniciando de nuevo el flujo completo de búsqueda para ese producto.

---

# Conclusiones

El LLM **no actúa como motor de búsqueda** ni como sistema de recomendación.

Su función consiste en:

- Comprender el lenguaje natural.
- Extraer filtros estructurados.
- Generar la consulta semántica.
- Redactar respuestas conversacionales.

La recuperación de productos se realiza mediante **ChromaDB**, utilizando embeddings y búsqueda vectorial sobre un conjunto previamente reducido mediante filtros de metadatos.

Finalmente, las reglas de negocio permiten incorporar criterios comerciales como stock, promociones o márgenes, obteniendo un sistema de búsqueda híbrida preciso, escalable y alineado con los objetivos del e-commerce.