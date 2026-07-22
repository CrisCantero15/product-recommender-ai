import { Agent, run } from "@openai/agents";

const agent = new Agent({
    name: "User Intent Analyzer",
    instructions:
        "Eres un sistema de análisis de intenciones para un buscador de productos. Tu única tarea es transformar el mensaje del usuario en un objeto JSON estructurado, sin buscar productos ni responder de forma conversacional.",
    model: "gpt-5.6",
});

export async function analyzeMessage(message) {

    const prompt = `Eres un sistema de análisis de intenciones para un buscador de productos HORECA (hostelería, restauración y catering).
                    Tu única tarea es transformar el mensaje en lenguaje natural del usuario en un objeto JSON estructurado. NO debes buscar productos, ni añadir explicaciones fuera del JSON. Devuelve ÚNICAMENTE el JSON, sin texto adicional, sin markdown, sin backticks.

                    ## PASO 1: VALIDAR SI ES UNA PETICIÓN REAL
                    Antes de analizar filtros, determina si el mensaje del usuario es una petición real de búsqueda/recomendación de producto, o si es un mensaje genérico sin intención de compra/búsqueda (saludos, agradecimientos, mensajes vacíos o ambiguos, small talk, preguntas no relacionadas con el catálogo).
                    - Si el mensaje SÍ es una petición real (aunque sea vaga, como "quiero aceite" o "algo para limpiar"): "is_valid_request": true, "generic_response": null, y continúa con el PASO 2 normalmente.
                    - Si el mensaje NO es una petición real (ej. "hola", "buenos días", "gracias", "¿cómo estás?"): "is_valid_request": false, "generic_response": un mensaje breve y amable en español invitando al usuario a describir qué producto busca (máx 2 frases), y todos los demás campos deben ir a null o vacío como corresponda.

                    ## PASO 2: DETECCIÓN OBLIGATORIA DE PRODUCTOS
                    Antes de rellenar cualquier campo del JSON, identifica cuántos productos o familias de productos independientes aparecen en el mensaje.
                    Debes construir mentalmente una lista:
                    productos_detectados = [
                        producto_1,
                        producto_2,
                        producto_3,
                        ...
                    ]
                    Considera productos distintos cuando el usuario utiliza conectores como:
                    - y
                    - además
                    - también
                    - aparte
                    - por otro lado
                    - junto con
                    - así como
                    - tanto ... como ...
                    - necesito X y Y
                    - quiero X, Y y Z
                    Si la lista contiene más de un elemento:
                    - Analiza ÚNICAMENTE el primero.
                    - Todos los demás deben aparecer en pending_products.
                    - multi_product_notice debe rellenarse obligatoriamente.
                    Si la lista contiene un único elemento:
                    - pending_products=[]
                    - multi_product_notice=null
                    ## FORMATO DE SALIDA (obligatorio)
                    {
                    "is_valid_request": boolean,
                    "generic_response": string | null,
                    "multi_product_notice": string | null,
                    "pending_products": string[],
                    "filters": {
                        "category": string | null,
                        "price_min": number | null,
                        "price_max": number | null,
                        "format": string | null,
                        "stock": boolean | null,
                        "graduation_min": number | null,
                        "graduation_max": number | null,
                        "origen": string | null,
                        "year": number | null
                    },
                    "attributes": string[],
                    "occasion": string | null,
                    "recipient": string | null,
                    "semantic_query": string | null
                    }

                    ## DEFINICIÓN DE CADA CAMPO
                    - **is_valid_request**: true si el usuario expresa intención de buscar/comprar/recibir recomendación de un producto del catálogo HORECA. false si es un mensaje genérico o completamente ajeno al catálogo.
                    - **generic_response**: SOLO se rellena cuando is_valid_request es false. Mensaje corto, cordial, en español, animando al usuario a decir qué tipo de producto busca (ej. "¡Hola! Cuéntame qué producto estás buscando para tu negocio y con gusto te ayudo a encontrarlo."). Si is_valid_request es true, este campo debe ser null.
                    - **multi_product_notice**: mensaje al usuario cuando ha pedido más de un producto, indicando que se muestran primero los resultados del primer producto y que puede continuar con los demás cuando quiera. null si solo hay un producto.
                    - **pending_products**: array con descripciones breves de los productos mencionados por el usuario que NO se están filtrando ahora (los que quedan pendientes). [] si solo hay un producto.
                    - **category**: tipo de producto. Valores admitidos: "Cerveza Retorno", "Cerveza", "Alhambra", "Sm", "Mahou", "Agua", "Aguas", "Bebidas", "Entera", "Lácteos y derivados", "Desnatada, Semidesnatada, Sin Lactosa", "Derivados", "Alimentación", "Semola, pasta y harina", "Harinas", "Conservas vegetales", "Alcachofas", "Esparragos", "Legumbres", "Pimientos y guindillas", "Tomates", "Setas, champillones y boletos", "Verduras", "Conservas de pescado", "Atun", "Bonito", "Ventresca", "Olivas y variantes", "Encurtidos", "Olivas", "Frutos secos", "Cacahuetes", "Cocktail", "Patatas", "Salsas", "Salsas y platos preparados", "Aceites y vinagres", "Freir", "Semillas", "Oliva", "Oliva virgen extra", "Caldo", "Frío y Congelado", "Embutidos y cárnicos (frío)", "Bacon", "Curados", "Jamón cocido", "Salchichas", "Precocinados (frío)", "Otros", "Ensaladas", "Mantequilla", "Lácteos (frío)", "Quesos", "Productos del mar (frío)", "Boquerones", "Gildas", "Anchoa", "Ovoderivados (frío)", "Huevos", "Precocinados (congelado)", "Café", "Complementos de Café", "VAJILLA", "AZÚCARES Y EDULCORANTES", "Vinos y Cavas", "Tinto", "Vinos de mesa", "Chardonnay", "Vinos", "D.o navarra blanco", "D.o. navarra rosado", "D.o. navarra tinto", "Albariño", "D.o. rias baixas blanco", "D.o. rioja blanco", "D.o. rioja tinto", "Rueda", "Moscato", "Rosado", "Sin d.o verdejo blanco", "Blanco", "Licores", "Vermouth", "Ginebra", "Ron", "Vodka", "Whisky", "Licores de hierbas", "Crema de licor", "Detergentes y otros", "Limpieza y complementos", "Limpieza", "Papel", "Complementos", "Cerveza Barril", "Resto de cervezas", "Salve", "Cerveza No Retornable", "Gaseosas", "Blanca", "Color", "Premium", "Tónica", "Soda", "Tonica", "Refrescos", "Cola", "Limón", "Manzana", "Naranja", "Otros sabores", "Zumos", "Arandano", "Melocotón", "Mosto", "Multifrutas", "Piña", "Tomate", "Agua con gas", "Sabores", "Bebidas Vegetales", "Batidos y Chocolates", "Reposteria y confituras", "Golosinas", "Confitura y miel", "Siropes y cremas", "Especies y condimentos", "Especias", "Sal", "Levaduras", "Ovoderivados", "Frutas", "Patés", "Berberechos", "Nueces", "Palomitas", "Snacks", "Platos combinados", "Quinta gama", "Vinagre", "Pasta", "Arroz", "Chorizo", "Pate", "Pavo y Pollo", "Cárnicos", "Leche", "Nata", "Yogures y Postres", "Anchoa cantabrico", "Bacalao", "Pulpo", "Tortilla", "Pan y pastas (congelado)", "Pan", "Hielo", "Productos del mar pescado (congelado)", "Pescado congelado", "Precocinados congelado", "Verduras (congelado)", "CAFÉ", "DESCAFEINADO", "MONODÓSIS", "Edulcorante", "TÉS E INFUSIONES", "CAFÉS SOLUBLES", "AZÚCARES PERSONALIZADOS", "COMPLEMENTOS DE CORTESÍA", "Chocolate", "Complementos de café", "Vino de autor tinto", "Resto", "d.o. cariñena", "D.o rioja tinto", "D.o. castilla leon tinto", "Penedes Blanco", "Penedes Rosado", "D.o. costers del segre blanco", "D.o. costers del segre tinto", "D.o. la mancha verdejo", "D.o. montsan", "Penedes Tinto", "D.o. ribera duero tinto", "D.o. rueda verdejo", "Sangría", "Txakoli", "D.o. empordà rosado", "Vinos generosos", "Barril", "No retornable", "Retornable", "Cava", "Champagne", "Anís", "Brandy", "Licores varios", "Pacharán", "Tequila", "Licores de frutas", "Orujo", "Aguardiente" (si no se especifica tipo). Si no se menciona, null.
                    - **price_min / price_max**: precio en euros como número (sin símbolo €). Interpreta "menos de X" como price_max=X, "más de X" como price_min=X, "entre X y Y" como ambos.
                    - **format**: tamaño o presentación del envase si se menciona. Valores admitidos: "1L", "5L", "10L", "1KG", "5KG", "10KG". null si no se menciona.
                    - **stock**: true solo si el usuario pide explícitamente disponibilidad inmediata ("que esté disponible ya", "en stock"). null si no se menciona.
                    - **graduation_min / graduation_max**: grado alcohólico en % si se menciona. Aplica principalmente a bebidas alcohólicas. null si no se menciona.
                    - **origen**: D.O. o indicación geográfica mencionada explícitamente (ej. "Rioja", "Ribera del Duero", "Jaén"). null si no se menciona.
                    - **year**: año/cosecha si se menciona explícitamente. null si no se menciona.
                    - **attributes**: lista de características sensoriales, cualitativas o funcionales mencionadas (ej. "afrutado", "ecológico", "sin gluten", "bajo en sal", "industrial", "premium", "económico"). Array vacío si no hay ninguna o si is_valid_request es false.
                    - **occasion**: motivo de la compra si se infiere claramente (ej. "regalo", "evento", "uso diario en cocina", "servicio de barra"). null si no es evidente.
                    - **recipient**: destinatario si se menciona (ej. "cliente del restaurante", "jefe de cocina"). null si no se menciona.
                    - **semantic_query**: frase descriptiva en español de 1-2 líneas, optimizada para búsqueda semántica vectorial, describiendo el producto ideal que busca el usuario. SOLO se rellena si is_valid_request es true y se refiere únicamente al PRIMER producto. Si is_valid_request es false, debe ser null. Además, no incluyas nada relacionado ni con el precio ni con el formato, cíñete simplemente a una descripción semántica.
                    - **output_message**: string. Frase breve (una sola oración) dirigida al usuario, en el mismo tono y grado de formalidad de su pregunta, que introduce el contenido que sigue a continuación (una lista, un dato, un resultado, etc.). Debe terminar siempre en dos puntos ":", sin punto final antes ni después. Ejemplos válidos: - "Aquí tienes los resultados que encontré:" - "Estos son los pasos que debes seguir:" - "El valor calculado es:" - Ejemplo inválido (no terminar en ":"): "Aquí tienes los resultados."

                    ## REGLAS IMPORTANTES
                    1. Si un dato no aparece en el mensaje, usa null (o [] para arrays). NUNCA inventes valores ni asumas por defecto.
                    2. Los precios y grados numéricos deben ser number, nunca strings.
                    3. Si el usuario da información ambigua pero SÍ hay intención de búsqueda (ej. "quiero algo bueno para la cocina"), trátalo como is_valid_request: true, y usa semantic_query para capturar esa vaguedad.
                    4. Si el mensaje no tiene relación alguna con productos HORECA (ni genérico ni petición, ej. pregunta sobre el tiempo), trátalo igualmente como is_valid_request: false con un generic_response adecuado.
                    5. La salida debe ser JSON válido y parseable. No uses comas finales, no uses comentarios.
                    6. En caso de múltiples productos, el análisis de filters, attributes, occasion, recipient y semantic_query se refiere ÚNICAMENTE al primer producto mencionado.

                    ## EJEMPLOS

                    Usuario: "Buenos días"
                    Salida:
                    {
                    "is_valid_request": false,
                    "generic_response": "¡Buenos días! Cuéntame qué producto estás buscando para tu negocio y te ayudo a encontrarlo.",
                    "multi_product_notice": null,
                    "pending_products": [],
                    "filters": {
                        "category": null, "price_min": null, "price_max": null, "format": null,
                        "stock": null, "graduation_min": null, "graduation_max": null,
                        "origen": null, "year": null
                    },
                    "attributes": [],
                    "occasion": null,
                    "recipient": null,
                    "semantic_query": null,
                    "output_message": null
                    }

                    Usuario: "Busco un aceite de oliva virgen extra ecológico por menos de 8€ el litro."
                    Salida:
                    {
                    "is_valid_request": true,
                    "generic_response": null,
                    "multi_product_notice": null,
                    "pending_products": [],
                    "filters": {
                        "category": "aceite de oliva virgen extra", "price_min": null, "price_max": 8, "format": "1L",
                        "stock": null, "graduation_min": null, "graduation_max": null,
                        "origen": null, "year": null
                    },
                    "attributes": ["ecológico"],
                    "occasion": null,
                    "recipient": null,
                    "semantic_query": "aceite de oliva virgen extra de producción ecológica, precio por litro inferior a 8 euros",
                    "output_message": "Aquí tienes los aceites de oliva virgen extra ecológicos que encajan con tu búsqueda:"
                    }

                    Usuario: "Necesito agua mineral sin gas y también detergente lavavajillas industrial."
                    Salida:
                    {
                    "is_valid_request": true,
                    "generic_response": null,
                    "multi_product_notice": "Te muestro primero los resultados para agua mineral sin gas. Cuando quieras, seguimos con el detergente lavavajillas industrial.",
                    "pending_products": ["detergente lavavajillas industrial"],
                    "filters": {
                        "category": "agua mineral", "price_min": null, "price_max": null, "format": null,
                        "stock": null, "graduation_min": null, "graduation_max": null,
                        "origen": null, "year": null
                    },
                    "attributes": ["sin gas"],
                    "occasion": null,
                    "recipient": null,
                    "semantic_query": "agua mineral sin gas para hostelería",
                    "output_message": "Estos son los resultados para agua mineral sin gas:"
                    }

                    ## MENSAJE DEL USUARIO
                    "${message}"
                    Responde SOLO con el JSON.
                    `;

    const start = performance.now();
    const result = await run(agent, prompt);
    const latency = performance.now() - start;

    try {
        const data = JSON.parse(result.finalOutput.trim());

        // Corte de flujo: si no es una petición real, se devuelve aquí
        if (!data.is_valid_request) {
            return {
                isValidRequest: false,
                message: data.generic_response ?? "¿Podrías decirme qué producto buscas?"
            };
        }

        return {
            isValidRequest: true,
            genericResponse: data.generic_response,
            multiProductNotice: data.multi_product_notice,
            pendingProducts: data.pending_products,
            filters: data.filters,
            attributes: data.attributes,
            occasion: data.occasion,
            recipient: data.recipient,
            semanticQuery: data.semantic_query,
            outputMessage: data.output_message
        };

    } catch (err) {

        console.error("Error parseando la respuesta del LLM: ", err, result.finalOutput);
        return null;

    } finally {

        console.log(`Latencia de respuesta del LLM: ${latency.toFixed(0)}ms`);
    
    }

}