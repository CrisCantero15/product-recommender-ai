import fs from "fs/promises";
import "dotenv/config";
import path from "path";
import crypto from "crypto";
import OpenAI from "openai";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: process.env.EMBEDDING_MODEL
});

const openai = new OpenAI();
const client = new ChromaClient({ path: process.env.CHROMA_URL });

// ---------- COLORS ----------
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
// ----------------------------

// ---------- CONFIG ----------
const PRODUCTSFILE = "results.json";
const BATCH_SIZE = 100;
// ----------------------------

function computeHash(product) {
    const relevantData = JSON.stringify({
        description: product.description,
        name: product.name ?? "",
        category: Array.isArray(product.categoria) ? product.categoria.join(", ") : (product.categoria ?? ""),
        format: product.format ?? "",
        hasPromotion: product.hasPromotion ?? false,
        isNew: product.isNew ?? false,
        price: product.price ?? 0,
        unitsPerBox: product.unitsPerBox ?? 0
    });
    return crypto.createHash("sha256").update(relevantData).digest("hex");
}

async function embedBatch(texts) {
    const res = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL,
        input: texts,
    });
    return res.data.map(d => d.embedding);
}

async function getExistingData(collection) {
    // Trae todos los ids + metadatas ya guardados (sin documentos ni embeddings)
    const existing = await collection.get({ include: ["metadatas"] });

    const hashMap = {};
    existing.ids.forEach((id, i) => {
        hashMap[id] = existing.metadatas[i]?._hash ?? null;
    });

    return {
        hashMap,
        existingIds: existing.ids // array plano de todos los ids ya en Chroma
    };
}

export async function createVectorDB({ reset = false } = {}) {

    try {

        // Borra la colección solo si se pide explícitamente (ej. createVectorDB({ reset: true }))
        if (reset) {
            await client.deleteCollection({ name: "products_db" }).catch(() => {});
            console.log(`${YELLOW}Colección "products_db" eliminada (reset solicitado).${RESET}`);
        }

        const collection = await client.getOrCreateCollection({
            name: "products_db",
            embeddingFunction: embedder
        });

        const rutaTxt = path.join(process.cwd(), "data", PRODUCTSFILE);
        const products = JSON.parse(await fs.readFile(rutaTxt, "utf-8"));

        const { hashMap: existingHashes, existingIds } = await getExistingData(collection);

        let documents = [];
        let ids = [];
        let metadatas = [];

        let skipped = 0;
        const currentIds = new Set();

        for (const product of products) {

            if (!product.description || !product.id) continue;

            const id = String(product.id);
            currentIds.add(id);

            const hash = computeHash(product);

            if (existingHashes[id] === hash) {
                skipped++;
                continue;
            }

            documents.push(product.description);
            ids.push(id);
            metadatas.push({
                name: product.name ?? "",
                category: Array.isArray(product.categoria)
                    ? product.categoria.join(", ")
                    : (product.categoria ?? ""),
                format: product.format ?? "",
                hasPromotion: product.hasPromotion ?? false,
                isNew: product.isNew ?? false,
                price: product.price ?? 0,
                unitsPerBox: product.unitsPerBox ?? 0,
                _hash: hash
            });

        }

        console.log(`${CYAN}Sin cambios: ${skipped} | Nuevos/actualizados: ${documents.length}${RESET}`);

        // ---------- Insertar / actualizar ----------
        if (documents.length > 0) {
            for (let i = 0; i < documents.length; i += BATCH_SIZE) {
                const docBatch = documents.slice(i, i + BATCH_SIZE);
                const idBatch = ids.slice(i, i + BATCH_SIZE);
                const metaBatch = metadatas.slice(i, i + BATCH_SIZE);

                const embeddings = await embedBatch(docBatch);

                await collection.upsert({
                    ids: idBatch,
                    documents: docBatch,
                    metadatas: metaBatch,
                    embeddings
                });

                console.log(`${GREEN}Lote ${i / BATCH_SIZE + 1} procesado (${docBatch.length} productos).${RESET}`);
            }
        } else {
            console.log(`${YELLOW}Nada que insertar o actualizar.${RESET}`);
        }

        // ---------- Borrar descatalogados ----------
        const idsToDelete = existingIds.filter(id => !currentIds.has(id));

        if (idsToDelete.length > 0) {
            // Borrado también en lotes, por si son muchos
            for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
                const deleteBatch = idsToDelete.slice(i, i + BATCH_SIZE);
                await collection.delete({ ids: deleteBatch });
            }
            console.log(`${RED}Eliminados ${idsToDelete.length} productos descatalogados.${RESET}`);
        } else {
            console.log(`${CYAN}No hay productos descatalogados para eliminar.${RESET}`);
        }

        console.log(`${GREEN}Sincronización completa.${RESET}`);

    } catch (error) {
        console.error(`${RED}Error sincronizando la base vectorial: ${error.message}${RESET}`);
        console.error(error.stack);
    }

}