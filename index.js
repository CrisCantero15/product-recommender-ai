import readline from 'readline';

import { initGetProducts } from './helpers/getRandomProducts.js';
import { initCreateDescriptions } from './helpers/createDescriptions.js';
import { createVectorDB } from './helpers/generateEmbeddings.js';
import { analyzeMessage } from './src/analyzeInput.js';
import { setQueryVectorDB } from './src/queryVectorDB.js';
import { applyRecommendationRules } from './src/recommendationRules.js';

// ---------- CONFIG ----------
const FILEPRODUCTS = "results.json";
// ----------------------------

function preguntar(rl, texto) {
    return new Promise((resolve) => rl.question(texto, resolve));
}

// !TODO: PENDIENTE DE APLICAR:
// - Guardar en el primer punto de interacción con el LLM la respuesta para seguir el hilo de la conversación con ese Agente (usuario-LLM)

async function runRecommendationPipeline(sessionId, userMessage) {

    // -------------- HELPERS --------------
    // 1. Obtener el listado de productos
    // await initGetProducts();
    // 2. Generar descripciones para cada uno de los productos
    // await initCreateDescriptions();
    // 3. Crear la BBDD vectorial
    // await createVectorDB({ reset: true });

    // -------------- SYSTEM FLOW --------------
    // 4. Obtener INPUT del usuario por terminal (solo para pruebas)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const message = await preguntar(rl, "Escribe tu mensaje: ");
    rl.close();

    // 4.1. Llamada al LLM para analizar el input --> Objeto
    const analysis = await analyzeMessage(message);
    // console.log(analysis);

    if (analysis === null) {
        // Fallo de parseo del LLM
        return {
            message: "Ha ocurrido un error analizando tu mensaje, ¿puedes reformularlo?",
            products: []
        };
    }

    // - Si el input NO tiene una petición, enviar un STRING de respuesta predeterminado y cerrar la función
    if (!analysis.isValidRequest) {
        return {
            message: analysis.message,
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
    const candidateProducts = await setQueryVectorDB(filters, semanticQuery);
    /*
    console.log(`\nResultados antes de aplicar reglas de negocio para: "${message}"\n`);
    candidateProducts.forEach((product, index) => {
        console.log(
            `${index + 1}. ${product.metadata.name} | Categoría/s: ${product.metadata.category} | (Distancia: ${product.rank})`
        );
    });
    */

    // !TODO: Validación - Si no existen productos, enviar un mensaje de "no tenemos productos en nuestro catálogo"

    // !TODO: Validación - Si el primer producto obtenido tiene un rank por encima de 0.7 (revisar), crear un mensaje de salida
    // genérico diciendo que no se han encontrado productos pero que se presentan los más parecidos.

    // 4.3. Obtener un primer ranking de recomendación y, posteriormente, reordenar según reglas de negocio
    const newProductRanking = applyRecommendationRules(candidateProducts);
    /*
    console.log(`\nResultados después de aplicar reglas de negocio para: "${message}"\n`);
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

}

runRecommendationPipeline()
    .then((resultado) => {
        console.log("\nResultado:");
        console.log(JSON.stringify(resultado, null, 2));
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });