import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";
import abonnementRoutes from "./src/routes/abonnementRoutes.js";
import reclamationRoutes from "./src/routes/reclamationRoutes.js";
import cron from "node-cron";
import { checkExpiredSubscriptions } from './src/utils/checkExpiredSubscriptions.js';
import consommationRoutes from "./src/routes/consommationRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import factureRoutes from "./src/routes/factureRoutes.js";

// Configuration initiale
dotenv.config();
console.log("🛠 JWT_SECRET =", process.env.JWT_SECRET);
const app = express();

// Middlewares
app.use(cors({
    origin: [
        "https://espace-client-theta.vercel.app", 
        "https://espace-client-theta.vercel.app/" // With/without trailing slas
    ],
    credentials: true,
}));
app.use(express.json());

// Connexion à MongoDB
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/abonnements", abonnementRoutes);
app.use("/api/reclamations", reclamationRoutes);
app.use("/api/consommation", consommationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/factures", factureRoutes);

// Port et démarrage serveur
const PORT = process.env.PORT || 5000;

mongoose.connection.once("open", () => {
console.log("Connecté à MongoDB !");
app.listen(PORT, () => console.log(` Serveur lancé sur le port ${PORT}`));
});

mongoose.connection.on("error", err => {
console.error("Erreur MongoDB:", err);
process.exit(1);
});

cron.schedule("0 0 * * *", async () => {
    console.log("Running daily check for expired subscriptions");
    const result = await checkExpiredSubscriptions();
    console.log("Check completed:", result);
});