import mongoose from "mongoose";

const consommationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["internet", "telephonie"], required: true },
    abonnementId: { type: mongoose.Schema.Types.ObjectId, ref: "Abonnement" },
    quantite: { type: Number, required: true }, // en Mo pour internet, en minutes pour téléphonie
    date: { type: Date, default: Date.now }  
}); 

export default mongoose.model("Consommation", consommationSchema);
