import { Agent, run } from "@openai/agents";
import "dotenv/config";
import fs from "fs/promises";
import path from "path";

const agent = new Agent({
    name: "Builder Descriptions",
    instructions:
        "Generas descripciones de producto de e-commerce en español, concisas y persuasivas, a partir de los datos que te proporcionan.",
    model: "gpt-5.6",
});

async function generarDescripcion(producto) {
    const prompt = `Genera una descripción de producto de e-commerce en español, entre 40 y 70 palabras, rica en detalles sensoriales y de uso (materiales, para quién es, en qué contexto se usa). No inventes características técnicas irreales, mantente genérico pero convincente.
                    Producto:
                    - Nombre: ${producto.name ?? ""}
                    - Marca: ${producto.brand ?? ""}
                    - Categorías: ${producto.categoria?.join(", ") ?? ""}
                    - Formato: ${producto.format ?? ""}
                    - Precio: ${producto.price ?? 0}€
                    Responde SOLO con la descripción, sin comillas ni texto adicional.`;

    const result = await run(agent, prompt);
    return result.finalOutput.trim();
}

export async function initCreateDescriptions() {
    const rutaTxt = path.join(process.cwd(), "data", "results.json");
    const contenido = await fs.readFile(rutaTxt, "utf-8");
    const products = JSON.parse(contenido);

    for (const product of products) {
        if (product.description) continue;

        console.log(`Generando descripción de ${product.name}...`);
        try {
            product.description = await generarDescripcion(product);
            await fs.writeFile(rutaTxt, JSON.stringify(products, null, 2), "utf-8");
            console.log("Descripción generada.");
        } catch (err) {
            console.error(`❌ Error en ${product.name}:`, err.message);
            // guardamos progreso antes de parar, por si quieres reanudar luego
            await fs.writeFile(rutaTxt, JSON.stringify(products, null, 2), "utf-8");
            process.exit(1);
        }
    }
    console.log(`✅ Generadas descripciones para ${products.length} productos en ${rutaTxt}`);
}