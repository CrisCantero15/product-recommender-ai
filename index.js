// import { initGetProducts } from './helpers/getRandomProducts.js';
// import { initCreateDescriptions } from './helpers/createDescriptions.js';
// import { createVectorDB } from './helpers/generateEmbeddings.js';
import { analyzeMessage } from './src/analyzeInput.js';
import { setQueryVectorDB } from './src/queryVectorDB.js';
import { applyRecommendationRules } from './src/recommendationRules.js';

// !TODO: PENDIENTE DE APLICAR:
// - Guardar en el primer punto de interacción con el LLM la respuesta para seguir el hilo de la conversación con ese Agente (usuario-LLM)

export async function runRecommendationPipeline(sessionId, session, userMessage) {

    try {
        // -------------- HELPERS (descomentar si se necesita regenerar datos) --------------
        // 1. Obtener el listado de productos
        // await initGetProducts();
        // 2. Generar descripciones para cada uno de los productos
        // await initCreateDescriptions();
        // 3. Crear la BBDD vectorial
        // await createVectorDB({ reset: true });

        // -------------- SYSTEM FLOW --------------

        // 4.1. Llamada al LLM para analizar el input --> Objeto
        const analysis = await analyzeMessage(userMessage, sessionId, session);
        // console.log(analysis);

        if (analysis === null) {
            // Fallo de parseo del LLM
            return {
                message: "Ha ocurrido un error analizando tu mensaje, ¿puedes reformularlo?",
                pendingProducts: [],
                products: []
            };
        }

        // - Si el input NO tiene una petición, enviar un STRING de respuesta predeterminado y cerrar la función
        if (!analysis.isValidRequest) {
            return {
                message: analysis.message,
                pendingProducts: [],
                products: []
            };
        }

        const {
            filters,
            semanticQuery,
            outputMessage,
            multiProductNotice,
            pendingProducts
        } = analysis;

        // 4.2. Lanzar la query filtrando por metadata
        let candidateProducts;

        try {
            candidateProducts = await setQueryVectorDB(filters, semanticQuery);
        } catch (error) {
            console.error(`[session:${sessionId}] Error al consultar la base de datos vectorial:`, error);
            return {
                message: "Lo siento, ha ocurrido un problema al buscar productos en nuestro catálogo. Por favor, inténtelo de nuevo en unos momentos.",
                pendingProducts: [],
                products: []
            };
        }

        // Validación - Si no existen productos, enviar un mensaje de "no tenemos productos en nuestro catálogo"
        if (!candidateProducts || candidateProducts.length === 0) {
            return {
                message: "Lo siento, no he encontrado productos con esas características en nuestro catálogo. ¿Quieres intentar con otra búsqueda?",
                pendingProducts: [],
                products: []
            };
        }
        /*
        console.log(`\nResultados antes de aplicar reglas de negocio para: "${userMessage}"\n`);
        candidateProducts.forEach((product, index) => {
            console.log(
                `${index + 1}. ${product.metadata.name} | Categoría/s: ${product.metadata.category} | (Distancia: ${product.rank})`
            );
        });
        */

        // !TODO: Validación - Si el primer producto obtenido tiene un rank por encima de 0.7 (revisar), crear un mensaje de salida
        // genérico diciendo que no se han encontrado productos pero que se presentan los más parecidos.

        // 4.3. Obtener un primer ranking de recomendación y, posteriormente, reordenar según reglas de negocio
        const newProductRanking = applyRecommendationRules(candidateProducts);
        /*
        console.log(`\nResultados después de aplicar reglas de negocio para: "${userMessage}"\n`);
        newProductRanking.forEach((product, index) => {
            console.log(
                `${index + 1}. ${product.metadata.name} | Categoría/s: ${product.metadata.category} | (Distancia: ${product.rank})`
            );
            console.log(`\nMetadata del producto: ${JSON.stringify(product.metadata, null, 2)}\n`);
        });
        */

        // Contiene TODA la información necesaria para generar la salida al usuario
        return {
            message: multiProductNotice ?? outputMessage,
            pendingProducts,
            products: newProductRanking
        };

    } catch (error) {
        console.error(`[session:${sessionId}] Error inesperado en runRecommendationPipeline:`, error);
        return {
            message: "Lo siento, ha ocurrido un error inesperado procesando tu solicitud. Por favor, inténtelo de nuevo.",
            pendingProducts: [],
            products: []
        };
    }
}