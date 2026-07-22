import fs from "fs/promises";
import path from "path";

const rutaTxt = path.join(process.cwd(), "data", "results.json");
const contenido = await fs.readFile(rutaTxt, "utf-8");
const products = JSON.parse(contenido);

for (const product of products) {
    product.description = "";
}

await fs.writeFile(rutaTxt, JSON.stringify(products, null, 2), "utf-8");
console.log("Descripciones eliminadas.");