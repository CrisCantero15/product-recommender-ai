import { runRecommendationPipeline } from './index.js';
import { getOrCreateSession } from './src/sessionStore.js';

import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json());

app.post('/api/chat', async (req, res) => {

    const { sessionId, message } = req.body;

    // Validación del sessionId (obligatorio, ver sessionStore.js)
    if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({
            status: false,
            message: "El campo 'sessionId' es obligatorio y debe ser un string."
        });
    }

    // Validación básica del mensaje del usuario
    if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            status: false,
            message: "El campo 'message' es obligatorio y debe ser un texto no vacío."
        });
    }

    try {
        const session = getOrCreateSession(sessionId);

        const response = await runRecommendationPipeline(sessionId, session, message);

        if (response && response.products?.length > 0) {
            return res.status(200).json({
                status: true,
                sessionId,
                message: response.message,
                pendingProducts: response.pendingProducts,
                products: response.products
            });
        }

        return res.status(200).json({
            status: false,
            sessionId,
            message: response.message,
            pendingProducts: response.pendingProducts
        });

    } catch (error) {
        console.error(`[session:${sessionId}] Error inesperado en /api/chat:`, error);
        return res.status(500).json({
            status: false,
            message: "Ha ocurrido un error inesperado procesando tu solicitud."
        });
    }

});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});