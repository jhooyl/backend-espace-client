import mongoose from "mongoose";

const historiqueAbonnementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    abonnementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Abonnement",
        required: true,
    },
    categorie: {
        type: String,
        enum: ["Particulier", "Professionnel"],
        required: true,
    },
    type: {
        type: String,
        enum: ["Internet", "Téléphonie"],
        required: true,
    },
    offre: {
        type: String,
        required: true,
    },
    debitOuVolume: {
        type: String,
        required: true,
    },
    prix: {
        type: Number,
        required: true,
    },
    duree: {
        type: String,
        required: true,
    },
    dateDebut: {
        type: Date,
        required: true,
    },
    dateExpiration: {
        type: Date,
        required: true,
    },
    statut: {
        type: String,
        enum: ["En cours", "Terminé", "Annulé"],
        required: true,
    },
    options: {
        augmentationDebit: { type: Boolean, default: false },
    },
    dateCreation: {
        type: Date,
        default: Date.now,
    }
});

const HistoriqueAbonnement = mongoose.model("HistoriqueAbonnement", historiqueAbonnementSchema);
export default HistoriqueAbonnement;