import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import OpenAI from "openai";
import { ChromaClient } from "chromadb";

const openai = new OpenAI();
const client = new ChromaClient({ host: "localhost", port: 8000 });

const EMBEDDING_MODEL = "text-embedding-3-small";

// Embedding function propia, para evitar que Chroma intente usar la de por defecto
const embeddingFunction = {
    generate: async (texts) => {
        const res = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: texts,
        });
        return res.data.map(d => d.embedding);
    }
};

async function main() {
    const rl = readline.createInterface({ input, output });

    const userInput = await rl.question("Introduce tu búsqueda: ");
    rl.close();

    const collection = await client.getOrCreateCollection({
        name: "products_db",
        embeddingFunction
    });

    const [queryVector] = await embeddingFunction.generate([userInput]);

    const results = await collection.query({
        queryEmbeddings: [queryVector],
        nResults: 10,
    });

    // ---------- Formatear ranking ----------
    const ids = results.ids[0];
    const metadatas = results.metadatas[0];
    const distances = results.distances[0];

    console.log(`\nResultados para: "${userInput}"\n`);

    ids.forEach((id, i) => {
        const meta = metadatas[i];
        const distancia = distances[i].toFixed(4);
        console.log(
            `${i + 1}. ${meta.name}  |  ${meta.price} €  |  ${meta.format || "sin formato"}  (distancia: ${distancia})`
        );
    });
}

main();