import "dotenv/config";
import OpenAI from "openai";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

const openai = new OpenAI();
const client = new ChromaClient({ path: process.env.CHROMA_URL });

const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: process.env.EMBEDDING_MODEL
});

export async function setQueryVectorDB(filters, query) {

    const collection = await client.getOrCreateCollection({
        name: "products_db",
        embeddingFunction: embedder
    });

    // Vector de la descripción
    const res = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL,
        input: [query],
    });
    const queryVector = res.data[0].embedding;

    // Filtros que Chroma puede resolver directamente (comparación exacta/rango)
    const conditions = [];

    if (filters.format) conditions.push({ format: filters.format });

    if (filters.price_min) conditions.push({ price: { $gte: filters.price_min } });
    if (filters.price_max) conditions.push({ price: { $lte: filters.price_max } });

    let where = undefined;
    if (conditions.length === 1) {
        where = conditions[0];
    } else if (conditions.length > 1) {
        where = { $and: conditions };
    }

    // Como "category" puede tener varios valores guardados en un mismo string
    // (ej: "Vinos y Cavas,Tinto,Vinos de mesa"), Chroma no puede filtrarlo
    // directamente en el "where" (no soporta "contains" sobre metadata).
    // Por eso, si hay filtro de categoría, pedimos más resultados de los
    // necesarios y filtramos nosotros mismos con .includes() después.
    const REQUESTED = 10;
    const OVERFETCH = filters.category ? 50 : REQUESTED;

    const queryOptions = {
        queryEmbeddings: [queryVector],
        nResults: OVERFETCH
    }
    
    if (where) queryOptions.where = where;

    const results = await collection.query(queryOptions);

    // ---------- Formatear ranking ----------
    const ids = results.ids[0];
    const metadatas = results.metadatas[0];
    const distances = results.distances[0];

    const outputProducts = [];

    ids.forEach((id, i) => {
        const meta = metadatas[i];

        // Post-filtro de categoría: buscamos si la categoría pedida
        // existe dentro del string guardado
        if (filters.category) {
            const categoryStr = meta.category ?? "";
            if (!categoryStr.includes(filters.category)) return;
        }

        const distance = distances[i].toFixed(4);
        outputProducts.push({
            id: id,
            metadata: meta,
            rank: distance
        });
    });

    return outputProducts.slice(0, REQUESTED);

}