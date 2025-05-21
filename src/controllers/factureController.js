import Abonnement from "../models/abonnementModel.js";
import Facture from "../models/factureModel.js";
import PDFDocument from "pdfkit";

// Fonctions utilitaires
const generateFactureReference = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `FACT-${year}${month}-${random}`;
};

const generateFactureForAbonnement = async (abonnement, userId) => {
    try {
        const reference = generateFactureReference();
        const dateEmission = new Date();
        const dateEcheance = new Date();
        dateEcheance.setDate(dateEcheance.getDate() + 15);

        const details = {
            nomOffre: abonnement.offre,
            categorie: abonnement.categorie,
            type: abonnement.type,
            debitOuVolume: abonnement.debitOuVolume,
            duree: abonnement.duree,
            dateDebut: abonnement.dateDebut,
            dateExpiration: abonnement.dateExpiration,
            volumeTotal: abonnement.volumeTotal,
            volumeConsomme: abonnement.volumeConsomme
        };

        const facture = new Facture({
            userId,
            abonnementId: abonnement._id,
            montant: abonnement.prix,
            dateEmission,
            dateEcheance,
            statut: "En attente",
            reference,
            details
        });

        await facture.save();
        return facture;
    } catch (error) {
        console.error("Erreur lors de la génération de la facture:", error);
        throw error;
    }
};


// Controller pour les utilisateurs
export const getUserFactures = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Recherche des factures de l'utilisateur
        const factures = await Facture.find({ userId }).sort({ dateEmission: -1 });
        
        // Génération automatique des factures pour les abonnements actifs sans facture récente
        const abonnements = await Abonnement.find({ 
            userId,
            statut: { $in: ["Actif", "actif"] }
        });
        
        // On vérifie pour chaque abonnement si une facture a été générée ce mois-ci
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        for (const abonnement of abonnements) {
            // Vérifier si une facture a déjà été générée pour cet abonnement ce mois-ci
            const existingFacture = await Facture.findOne({
                abonnementId: abonnement._id,
                dateEmission: { $gte: firstDayOfMonth }
            });
            
            if (!existingFacture) {
                // Générer une nouvelle facture
                await generateFactureForAbonnement(abonnement, userId);
            }
        }
        
        // Récupérer à nouveau toutes les factures (incluant les nouvelles)
        const updatedFactures = await Facture.find({ userId })
            .sort({ dateEmission: -1 })
            .populate("abonnementId");
        
        res.status(200).json(updatedFactures);
    } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des factures" });
    }
};

export const getFactureById = async (req, res) => {
    try {
        const { factureId } = req.params;
        const userId = req.user.id;
        
        // Recherche de la facture par ID
        const facture = await Facture.findById(factureId).populate("abonnementId");
        
        if (!facture) {
            return res.status(404).json({ message: "Facture non trouvée" });
        }
        
        // Vérifier si l'utilisateur est autorisé à voir cette facture
        if (facture.userId.toString() !== userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "Accès non autorisé à cette facture" });
        }
        
        res.status(200).json(facture);
    } catch (error) {
        console.error("Erreur lors de la récupération de la facture:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération de la facture" });
    }
};

export const generateFacturePDF = async (req, res) => {
    try {
        const { factureId } = req.params;
        const userId = req.user.id;
        
        // Recherche de la facture
        const facture = await Facture.findById(factureId)
            .populate("abonnementId")
            .populate("userId");
        
        if (!facture) {
            return res.status(404).json({ message: "Facture non trouvée" });
        }
        
        // Vérifier si l'utilisateur est autorisé à accéder à cette facture
        if (facture.userId._id.toString() !== userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "Accès non autorisé à cette facture" });
        }
        
        const user = facture.userId;
        
        // Création du PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Définir le nom du fichier
        const filename = `facture-${facture.reference}.pdf`;
        
        // En-têtes pour forcer le téléchargement
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        
        // Pipe le PDF directement dans la réponse
        doc.pipe(res);
        
        // En-tête du PDF
        doc.fontSize(25).text('Facture', { align: 'center' });
        doc.moveDown();
        
        // Informations de l'entreprise
        // Informations de l'entreprise
        doc.fontSize(10)
        .text('Algérie Télécom - Direction de Wilaya d\'Alger', { align: 'right' })
        .text('Agence Commerciale El Harrach', { align: 'right' })
        .text('Cité des 600 Logements, El Harrach', { align: 'right' })
        .text('Tél : 023 82 91 91', { align: 'right' })
        .text('NIF : 000016096917404', { align: 'right' })
        .moveDown();

        // Informations client
        doc.fontSize(12).text('Informations client:');
        doc.fontSize(10)
            .text(`Numéro client: ${user.numClient}`)
            .text(`Numéro de téléphone: ${user.numTel}`)
            .text(`Email: ${user.email}`)
            .moveDown();
        
        // Détails de la facture
        doc.fontSize(12).text('Détails de la facture:');
        doc.fontSize(10)
            .text(`Référence: ${facture.reference}`)
            .text(`Date d'émission: ${facture.dateEmission.toLocaleDateString()}`)
            .text(`Date d'échéance: ${facture.dateEcheance.toLocaleDateString()}`)
            .text(`Statut: ${facture.statut}`)
            .moveDown();
        
        // Détails de l'abonnement
        doc.fontSize(12).text('Détails de l\'abonnement:');
        doc.fontSize(10)
            .text(`Offre: ${facture.details.nomOffre}`)
            .text(`Type: ${facture.details.type}`)
            .text(`Catégorie: ${facture.details.categorie}`)
            .text(`Débit/Volume: ${facture.details.debitOuVolume}`)
            .text(`Volume total: ${facture.details.volumeTotal}`)
            .text(`Durée: ${facture.details.duree}`)
            .moveDown();
        
        // Tableau récapitulatif
        doc.fontSize(12).text('Récapitulatif:');
        
        // En-tête du tableau
        const invoiceTableTop = doc.y + 30;
        doc.font('Helvetica-Bold');
        doc.fontSize(10)
            .text('Description', 50, invoiceTableTop)
            .text('Montant (DA)', 400, invoiceTableTop)
            .moveDown();
        
        // Contenu du tableau
        doc.font('Helvetica');
        doc.text(`Abonnement ${facture.details.nomOffre}`, 50, invoiceTableTop + 20)
            .text(`${facture.montant.toFixed(2)}`, 400, invoiceTableTop + 20)
            .moveDown();
        
        // Total
        const totalPosition = invoiceTableTop + 60;
        doc.font('Helvetica-Bold')
            .text('Total:', 350, totalPosition)
            .text(`${facture.montant.toFixed(2)} DA`, 400, totalPosition)
            .moveDown();
        
        // Pied de page
        const bottomPosition = doc.page.height - 100;
        doc.fontSize(10).text('Merci d\'avoir choisi Algérie Télécom', 50, bottomPosition, { align: 'center' });
        doc.fontSize(8).text('Pour toute question concernant cette facture, veuillez contacter notre service client.', 50, bottomPosition + 15, { align: 'center' });
        
        // Finaliser le PDF
        doc.end();
    } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        res.status(500).json({ message: "Erreur serveur lors de la génération du PDF" });
    }
};

export const payerFacture = async (req, res) => {
    try {
        const { factureId } = req.params;
        const { method } = req.body;
        const userId = req.user.id;

        if (!['CIB', 'DAHABIA'].includes(method)) {
            return res.status(400).json({ message: "Méthode de paiement invalide. Choisissez CIB ou DAHABIA." });
        }

        const facture = await Facture.findById(factureId);

        if (!facture) {
            return res.status(404).json({ message: "Facture non trouvée" });
        }

        if (facture.userId.toString() !== userId) {
            return res.status(403).json({ message: "Accès non autorisé à cette facture" });
        }

        if (facture.statut === "Payée") {
            return res.status(400).json({ message: "Cette facture a déjà été payée" });
        }

        // Simuler le paiement
        facture.statut = "Payée";
        facture.datePaiement = new Date();
        facture.paymentMethod = method; // 💥 Store the method

        await facture.save();

        res.status(200).json({ 
            message: `Paiement effectué avec succès par ${method}`, 
            facture 
        });
    } catch (error) {
        console.error("Erreur lors du paiement de la facture:", error);
        res.status(500).json({ message: "Erreur serveur lors du paiement de la facture" });
    }
};


// Controller pour les administrateurs
export const getAllFactures = async (req, res) => {
    try {
        const { userId, statutFilter, dateDebutFilter, dateFinFilter, page = 1, limit = 10 } = req.query;
        
        // Construction du filtre
        const filter = {};
        
        // Filtre par utilisateur si spécifié
        if (userId) {
            filter.userId = userId;
        }
        
        // Filtre par statut
        if (statutFilter) {
            filter.statut = statutFilter;
        }
        
        // Filtre par date
        if (dateDebutFilter || dateFinFilter) {
            filter.dateEmission = {};
            
            if (dateDebutFilter) {
                filter.dateEmission.$gte = new Date(dateDebutFilter);
            }
            
            if (dateFinFilter) {
                filter.dateEmission.$lte = new Date(dateFinFilter);
            }
        }
        
        // Calcul des valeurs pour la pagination
        const skip = (page - 1) * limit;
        
        // Récupération des factures avec pagination
        const factures = await Facture.find(filter)
            .sort({ dateEmission: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("userId", "numClient numTel email")
            .populate("abonnementId");
        
        // Comptage total pour la pagination
        const total = await Facture.countDocuments(filter);
        
        res.status(200).json({
            factures,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des factures" });
    }
};

export const getFactureStatistics = async (req, res) => {
    try {
        // Statistiques globales
        const totalFactures = await Facture.countDocuments();
        const totalPayees = await Facture.countDocuments({ statut: "Payée" });
        const totalEnAttente = await Facture.countDocuments({ statut: "En attente" });
        const totalEnRetard = await Facture.countDocuments({ statut: "En retard" });
        const totalAnnulees = await Facture.countDocuments({ statut: "Annulée" });
        
        // Calcul du montant total payé
        const facturesPayees = await Facture.find({ statut: "Payée" });
        const montantTotalPaye = facturesPayees.reduce((total, facture) => total + facture.montant, 0);
        
        // Calcul du montant total en attente
        const facturesEnAttente = await Facture.find({ statut: "En attente" });
        const montantTotalEnAttente = facturesEnAttente.reduce((total, facture) => total + facture.montant, 0);
        
        // Statistiques par type d'abonnement
        const abonnements = await Abonnement.find();
        const statsParType = {};
        
        for (const abonnement of abonnements) {
            const facturesType = await Facture.find({ abonnementId: abonnement._id });
            if (!statsParType[abonnement.type]) {
                statsParType[abonnement.type] = {
                    totalFactures: 0,
                    totalMontant: 0,
                    totalPayees: 0,
                    montantPaye: 0
                };
            }
            
            statsParType[abonnement.type].totalFactures += facturesType.length;
            statsParType[abonnement.type].totalMontant += facturesType.reduce((total, facture) => total + facture.montant, 0);
            
            const facturesPayeesType = facturesType.filter(facture => facture.statut === "Payée");
            statsParType[abonnement.type].totalPayees += facturesPayeesType.length;
            statsParType[abonnement.type].montantPaye += facturesPayeesType.reduce((total, facture) => total + facture.montant, 0);
        }
        
        // Statistiques par mois (pour l'année en cours)
        const currentYear = new Date().getFullYear();
        const statsParMois = Array(12).fill().map(() => ({ totalFactures: 0, montantTotal: 0, totalPayees: 0, montantPaye: 0 }));
        
        const facturesAnneeEnCours = await Facture.find({
            dateEmission: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`)
            }
        });
        
        for (const facture of facturesAnneeEnCours) {
            const mois = facture.dateEmission.getMonth();
            statsParMois[mois].totalFactures++;
            statsParMois[mois].montantTotal += facture.montant;
            
            if (facture.statut === "Payée") {
                statsParMois[mois].totalPayees++;
                statsParMois[mois].montantPaye += facture.montant;
            }
        }
        
        res.status(200).json({
            global: {
                totalFactures,
                totalPayees,
                totalEnAttente,
                totalEnRetard,
                totalAnnulees,
                montantTotalPaye,
                montantTotalEnAttente,
                tauxPaiement: totalFactures ? ((totalPayees / totalFactures) * 100).toFixed(2) : 0
            },
            parType: statsParType,
            parMois: statsParMois
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des statistiques" });
    }
};