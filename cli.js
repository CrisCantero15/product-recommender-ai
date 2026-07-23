import readline from 'readline';
import { runRecommendationPipeline } from './index.js';
import { getOrCreateSession } from './src/sessionStore.js';

function preguntar(rl, texto) {
    return new Promise((resolve) => rl.question(texto, resolve));
}

async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const message = await preguntar(rl, "Escribe tu mensaje: ");
    rl.close();

    const sessionId = "cli-test-session"; // ID fijo para pruebas manuales
    const session = getOrCreateSession(sessionId); // MemorySession real, pero reutilizable entre ejecuciones

    const resultado = await runRecommendationPipeline(sessionId, session, message);
    console.log("\nResultado:");
    console.log(JSON.stringify(resultado, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});