import { runRecommendationPipeline } from './index.js';
import { getOrCreateSession } from './src/sessionStore.js';

import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// Middleware para parsear JSON en el body de las peticiones
app.use(express.json());

// GET con parámetro en la URL
app.get('/api/chat', (req, res) => {
    
    const { sessionId, message } = req.body;

    // !TODO: Validar el mensaje del usuario

    // Validar el ID de sesión del usuario
    const session = getOrCreateSession(sessionId);

    const response = await runRecommendationPipeline(session, message);

    if (response && response.products.length > 0) {
        
        res.json({ 
            status: true,
            message: response.message,
            products: response.products,
        });

    } else {

        res.json({
            status: false,
            message: response.message
        });

    }

});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});