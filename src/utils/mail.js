import nodemailer from "nodemailer"; // For sending emails
import crypto from "crypto"; // For generating secure tokens
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10; 

// Configure your email transporter 
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Demande de réinitialisation de mot de passe**
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    try {
        // Validation de l'email
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: "Format d'email invalide", 
                code: "INVALID_EMAIL" 
            });
        }

        // Recherche de l'utilisateur
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun compte associé à cet email", 
                code: "USER_NOT_FOUND" 
            });
        }

        // Génération d'un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 heure
        
        // Sauvegarde du token dans la base de données
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // Construction de l'URL de réinitialisation
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        // Envoi de l'email
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
                <h1>Réinitialisation de mot de passe</h1>
                <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
                <p>Cliquez sur le lien ci-dessous pour le réinitialiser :</p>
                <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
                <p>Ce lien est valable pendant 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ 
            success: true, 
            message: "Instructions de réinitialisation envoyées par email" 
        });

    } catch (error) {
        console.error("Erreur de réinitialisation:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erreur serveur", 
            code: "SERVER_ERROR" 
        });
    }
};

//Validation du token et réinitialisation du mot de passe
export const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        // Vérifie que l'email et le mot de passe sont fournis
        if (!email || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: "Email et nouveau mot de passe requis", 
                code: "MISSING_FIELDS" 
            });
        }

        // Vérifie la force du mot de passe
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{10,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            return res.status(400).json({ 
                success: false, 
                message: "Mot de passe trop faible", 
                code: "WEAK_PASSWORD" 
            });
        }

        // Recherche de l'utilisateur avec l'email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Utilisateur non trouvé", 
                code: "USER_NOT_FOUND" 
            });
        }

        // Mise à jour du mot de passe
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: "Mot de passe réinitialisé avec succès" 
        });

    } catch (error) {
        console.error("Erreur de réinitialisation:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erreur serveur", 
            code: "SERVER_ERROR" 
        });
    }
};
