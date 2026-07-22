// src/sessionStore.js
import { MemorySession } from "@openai/agents";

const sessions = new Map();

/**
 * Recupera la sesión existente para un sessionId dado,
 * o crea una nueva si no existe.
 *
 * @param {string} sessionId - UUID generado por el cliente.
 * @returns {MemorySession} Instancia de sesión asociada.
 */
export function getOrCreateSession(sessionId) {
    if (!sessionId) {
        throw new Error('sessionId es obligatorio.');
    }

    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, new MemorySession(sessionId));
    }

    return sessions.get(sessionId);
}