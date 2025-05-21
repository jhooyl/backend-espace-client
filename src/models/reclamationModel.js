import mongoose from "mongoose";

const reclamationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sujet: { type: String, required: true },
    message: { type: String, required: true },
    statut: { type: String, enum: ["en attente", "traité"], default: "en attente" },
    reponse: { type: String, default: null }, // Réponse de l'admin
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Admin qui a répondu
    dateReponse: { type: Date, default: null }, // ✅ Ajout de la date de réponse
    date: { type: Date, default: Date.now }
});


export default mongoose.model("Reclamation", reclamationSchema);


/*

http://localhost:5000/api/reclamations
{
    "sujet": "Problème de connexion",
    "message": "Je n'arrive pas à accéder à mon compte"
}




*/ 