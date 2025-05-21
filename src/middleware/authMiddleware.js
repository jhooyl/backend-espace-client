import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/userModel.js";

dotenv.config();

const authMiddleware = async (req, res, next) => {
    console.log("Headers:", req.headers);
    const authHeader = req.header("Authorization");
    console.log("Auth header:", authHeader);
    
    const token = authHeader?.split(" ")[1]; // Extract token from "Bearer TOKEN"
    
    if (!token) {
        return res.status(403).json({ success: false, message: "Authentification requise", code: "NO_TOKEN" });
    }
    
    console.log("Received token:", token.substring(0, 10) + "..."); 
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token verified for userId:", decoded.userId);

        // 🔍 Récupérer l'utilisateur depuis la base de données
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable", code: "USER_NOT_FOUND" });
        }

        req.user = user; // ✅ On attache l'objet complet
        next(); // 🔄 On passe au middleware suivant

    } catch (error) {
        console.error("Token verification error:", error.message);
        const response = { success: false, message: "Session invalide", code: "INVALID_TOKEN" };

        if (error.name === "TokenExpiredError") {
            response.message = "Session expirée";
            response.code = "TOKEN_EXPIRED";
        }

        return res.status(401).json(response);
    }
};

export default authMiddleware;
