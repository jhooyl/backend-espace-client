import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {transporter} from "../utils/mail.js"; 
import crypto from "crypto";

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET non défini dans l'environnement.");
}

console.log("Mode actuel :", process.env.NODE_ENV);

// Configuration JWT
const JWT_CONFIG = { algorithm: "HS256" };
const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION_SECONDS = 86400; // 1 jour

// Cache global pour stocker les tokens actifs
if (!global.tokenCache) {
    global.tokenCache = new Map();
}

// Fonction pour générer un token JWT
const generateToken = (user) => {
    if (!user || !user._id || !user.role) {
        throw new Error("Utilisateur invalide pour la génération du token.");
    }

    if (global.tokenCache.has(user._id)) {
        const cachedToken = global.tokenCache.get(user._id);
        try {
            jwt.verify(cachedToken, process.env.JWT_SECRET);
            console.log(`✅ Using cached token for user: ${user._id}`);
            return cachedToken;
        } catch (err) {
            console.log(`⚠️ Cached token invalid for user: ${user._id}, generating a new one.`);
        }
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const newToken = jwt.sign(
        { userId: user._id, role: user.role, iat: currentTime, exp: currentTime + TOKEN_EXPIRATION_SECONDS },
        process.env.JWT_SECRET,
        JWT_CONFIG
    );

    global.tokenCache.set(user._id, newToken);
    console.log(`🚀 Generated NEW token for user: ${user._id}`);

    return newToken;
};

// Fonction pour invalider un token (déconnexion)
export const invalidateToken = (userId) => {
    global.tokenCache.delete(userId);
};


export const registerUser = async (req, res) => {
    const { numTel, MSISDN, numClient, mobile, email, password, clientType, role = "client" } = req.body;

    try {
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ success: false, message: "Format d'email invalide", code: "INVALID_EMAIL" });
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({ success: false, message: "Mot de passe trop faible", code: "WEAK_PASSWORD" });
        }

        if (!/^[0-9]{10}$/.test(numTel)) {
            return res.status(400).json({ success: false, message: "Numéro de téléphone invalide", code: "INVALID_PHONE" });
        }

        const existingUser = await User.findOne({ 
            $or: [{ numTel }, { MSISDN }, { email }, { numClient }]
        });

        if (existingUser) {
            return res.status(409).json({ success: false, message: "Utilisateur déjà existant", code: "ACCOUNT_EXISTS" });
        }

        if (role === "client" && !clientType) {
            return res.status(400).json({ success: false, message: "clientType est obligatoire pour les clients", code: "CLIENT_TYPE_REQUIRED" });
        }

        const userData = {
            numTel,
            MSISDN,
            numClient,
            mobile,
            email,
            password: await bcrypt.hash(password, SALT_ROUNDS),
            role
        };

        if (role === "client") {
            userData.clientType = clientType;
        }

        const newUser = new User(userData);
        await newUser.save();

        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: "Compte créé avec succès",
            token,
            userId: newUser._id,
            expiresIn: TOKEN_EXPIRATION_SECONDS,
            userType: role
        });

    } catch (error) {
        console.error("Erreur d'inscription:", error);
        return res.status(500).json({ success: false, message: "Erreur serveur", code: "SERVER_ERROR" });
    }
};

// Générer un code 2FA sécurisé
const generateTwoFactorCode = async (user) => {
    const code = crypto.randomInt(100000, 999999).toString();
    user.twoFactorCode = code;
    user.twoFactorExpires = Date.now() + 5 * 60 * 1000; // Expire en 5 minutes
    await user.save();

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: "Votre code d'authentification à deux facteurs",
            text: `Votre code de vérification est : ${code}`
        });
        return true;
    } catch (error) {
        console.error("Erreur d'envoi email 2FA:", error);
        return false;
    }
};



export const loginUser = async (req, res) => {
    const { identifier, password, twoFactorCode } = req.body;

    try {
        // Vérifier que l'identifiant et le mot de passe sont fournis
        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Identifiant et mot de passe requis",
                code: "MISSING_CREDENTIALS"
            });
        }

        // Recherche de l'utilisateur
        const user = await User.findOne({ 
            $or: [{ numTel: identifier }, { email: identifier }]
        }).select("+password");

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Identifiants incorrects",
                code: "INVALID_CREDENTIALS"
            });
        }

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: "Identifiants incorrects",
                code: "INVALID_CREDENTIALS"
            });
        }

        // Étape 1 : Si le code 2FA n'est pas fourni, on l'envoie
        if (!twoFactorCode) {
            const emailSent = await generateTwoFactorCode(user);
            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    message: "Erreur lors de l'envoi du code 2FA",
                    code: "EMAIL_SEND_ERROR"
                });
            }
            return res.status(202).json({ 
                success: true, 
                message: "Code 2FA envoyé", 
                requiresTwoFactor: true 
            });
        }

        // Étape 2 : Vérification du code 2FA
        if (!user.twoFactorCode || user.twoFactorCode !== twoFactorCode || user.twoFactorExpires < Date.now()) {
            return res.status(401).json({ 
                success: false, 
                message: "Code 2FA invalide ou expiré",
                code: "INVALID_2FA"
            });
        }

        // Authentification réussie, génération du token JWT
        const token = generateToken(user);
        
        // Nettoyage des données sensibles après validation
        user.twoFactorCode = undefined;
        user.twoFactorExpires = undefined;
        await user.save();

        return res.json({ 
            success: true, 
            message: "Connexion réussie", 
            token,
            userId: user._id,
            expiresIn: TOKEN_EXPIRATION_SECONDS,
            userType: user.role
        });

    } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erreur serveur", 
            code: "SERVER_ERROR" 
        });
    }
};

// Vérification code 2FA
export const verifyTwoFactorCode = async (req, res) => {
    const { identifier, twoFactorCode } = req.body;
    try {
        if (!identifier || !twoFactorCode) {
            return res.status(400).json({
                success: false,
                message: "Identifiant et code 2FA requis",
                code: "MISSING_FIELDS"
            });
        }

        const user = await User.findOne({
            $or: [{ numTel: identifier }, { email: identifier }]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé",
                code: "USER_NOT_FOUND"
            });
        }

        if (user.twoFactorCode !== twoFactorCode || user.twoFactorExpires < Date.now()) {
            return res.status(401).json({
                success: false,
                message: "Code 2FA invalide ou expiré",
                code: "INVALID_2FA"
            });
        }

        // Authentification réussie, génération du token JWT
        const token = generateToken(user);
        
        // Nettoyage des données sensibles après validation
        user.twoFactorCode = undefined;
        user.twoFactorExpires = undefined;
        await user.save();

        return res.json({
            success: true,
            message: "Authentification réussie",
            token,
            userId: user._id,
            expiresIn: TOKEN_EXPIRATION_SECONDS,
            userType: user.role
        });

    } catch (error) {
        console.error("Erreur de vérification 2FA:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur",
            code: "SERVER_ERROR"
        });
    }
};



export const logoutUser = (req, res) => {
    invalidateToken(req.user.userId);
    res.json({ success: true, message: "Déconnexion réussie" });
};

export const getProfile = async (req, res) => {
    try {
        const userId = req.user._id; 
        const user = await User.findById(userId); 

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Utilisateur non trouvé", 
                code: "USER_NOT_FOUND" 
            });
        }

        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Erreur serveur", 
            code: "SERVER_ERROR" 
        });
    }
};



export const updateUser = async (req, res) => {
    const userId = req.user._id;
    const updates = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé",
                code: "USER_NOT_FOUND"
            });
        }

        const allowedFields = ["email", "numTel", "mobile", "MSISDN"];
        const sanitizedUpdates = {};

        allowedFields.forEach(field => {
            if (updates.hasOwnProperty(field)) {
                sanitizedUpdates[field] = updates[field];
            }
        });

        Object.assign(user, sanitizedUpdates);
        await user.save();

        return res.json({
            success: true,
            message: "Profil mis à jour",
            user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Échec de la mise à jour",
            code: "UPDATE_FAILED"
        });
    }
};



//Récupérer tous les utilisateurs avec leurs réclamations
export const getAllUsersWithClaims = async (req, res) => {
    try {
        console.log("🛠️ Vérification : Requête reçue pour récupérer tous les utilisateurs.");

        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Accès refusé" });
        }

        console.log("✅ L'utilisateur est un administrateur.");

        // Vérification avant la requête MongoDB
        const users = await User.find({ role: "client" }).populate("reclamations");
        
        console.log("✅ Utilisateurs récupérés avec succès:", users);

        return res.json({ success: true, users });

    } catch (error) {
        console.error("❌ Erreur dans getAllUsersWithClaims:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};



export const getUserDetails = async (req, res) => { 
    try {
        // Vérifier que l'utilisateur est admin
        if (req.user.role !== "admin") {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé : droits insuffisants" 
            });
        }

        const user = await User.findById(req.params.userId)
            .populate({
                path: "reclamations",
                match: { statut: { $ne: "resolu" } }, // Seulement les réclamations non résolues
                options: { sort: { createdAt: -1 } } // Plus récentes d'abord
            })
            .select("-password"); // Exclure le mot de passe

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Utilisateur non trouvé" 
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                numTel: user.numTel,
                email: user.email,
                clientType: user.clientType,
                role: user.role,
                createdAt: user.createdAt,
                reclamations: user.reclamations || []
            }
        });
    } catch (error) {
        console.error("Erreur admin (détails utilisateur):", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur",
            error: error.message 
        });
    }
};

export const changePassword = async (req, res) => {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(userId).select("+password");

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }

        // Vérifier le mot de passe actuel
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect" });
        }

        // Vérifier la force du nouveau mot de passe
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            return res.status(400).json({ success: false, message: "Nouveau mot de passe trop faible" });
        }

        // Hasher et mettre à jour
        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        return res.json({ success: true, message: "Mot de passe mis à jour avec succès" });

    } catch (error) {
        console.error("Erreur lors du changement de mot de passe:", error);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

