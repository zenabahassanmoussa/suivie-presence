import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lycee',
  port: process.env.DB_PORT || 3306
};

// Fonction pour générer un mot de passe aléatoire
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Middleware de connexion à la DB
const getDBConnection = async () => {
  try {
    const connection = await createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('❌ Erreur connexion DB:', error.message);
    throw error;
  }
};

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token invalide' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Erreur auth:', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Middleware de logging pour debugger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Route pour initialiser la base de données avec des données de test
app.post('/api/init-db', async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    
    // Création des tables si elles n'existent pas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS enseignants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS parents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        enseignant_id INT,
        FOREIGN KEY (enseignant_id) REFERENCES enseignants(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS eleves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        classe_id INT,
        parent_id INT,
        FOREIGN KEY (classe_id) REFERENCES classes(id),
        FOREIGN KEY (parent_id) REFERENCES parents(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS presences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eleve_id INT,
        date DATE NOT NULL,
        present BOOLEAN DEFAULT FALSE,
        heure_arrivee TIME,
        justification TEXT,
        FOREIGN KEY (eleve_id) REFERENCES eleves(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enseignant_id INT,
        eleve_id INT,
        parent_id INT,
        message TEXT NOT NULL,
        type ENUM('absence', 'retard', 'autre') DEFAULT 'autre',
        date DATETIME NOT NULL,
        lue BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (enseignant_id) REFERENCES enseignants(id),
        FOREIGN KEY (eleve_id) REFERENCES eleves(id),
        FOREIGN KEY (parent_id) REFERENCES parents(id)
      )
    `);

    // Insertion des données de test
    // 1. Insertion de l'admin
    await connection.execute(
      'INSERT IGNORE INTO admins (id, nom, prenom, email, password) VALUES (1, "Admin", "System", "admin@ecole.fr", "admin123")'
    );
    
    // 2. Insertion des enseignants
    await connection.execute(
      'INSERT IGNORE INTO enseignants (nom, prenom, email, password) VALUES ("Kone", "Fatou", "fatou.kone@mail.com", "1234")'
    );

    await connection.execute(
      'INSERT IGNORE INTO enseignants (nom, prenom, email, password) VALUES ("Traore", "Ibrahim", "ibrahim.traore@mail.com", "4567")'
    );

    await connection.execute(
      'INSERT IGNORE INTO enseignants (nom, prenom, email, password) VALUES ("Diop", "Mariama", "mariama.diop@mail.com", "7890")'
    );

    await connection.execute(
      'INSERT IGNORE INTO enseignants (nom, prenom, email, password) VALUES ("Ba", "Modou", "modou.ba@mail.com", "1011")'
    );

    // 3. Insertion des parents
    await connection.execute(
      'INSERT IGNORE INTO parents (nom, prenom, email, password) VALUES ("Ndiaye", "Awa", "awa.ndiaye@mail.com", "password1")'
    );

    await connection.execute(
      'INSERT IGNORE INTO parents (nom, prenom, email, password) VALUES ("Diallo", "Moussa", "moussa.diallo@mail.com", "password2")'
    );

    await connection.execute(
      'INSERT IGNORE INTO parents (nom, prenom, email, password) VALUES ("Kane", "Aminata", "amina.kane@mail.com", "password3")'
    );

    await connection.execute(
      'INSERT IGNORE INTO parents (nom, prenom, email, password) VALUES ("Sow", "Abdoulaye", "abdoul.sow@mail.com", "password4")'
    );

    // 4. Insertion des classes
    await connection.execute(
      'INSERT IGNORE INTO classes (nom, enseignant_id) VALUES ("6ème A", 1)'
    );

    await connection.execute(
      'INSERT IGNORE INTO classes (nom, enseignant_id) VALUES ("6ème B", 2)'
    );

    await connection.execute(
      'INSERT IGNORE INTO classes (nom, enseignant_id) VALUES ("5ème A", 3)'
    );

    await connection.execute(
      'INSERT IGNORE INTO classes (nom, enseignant_id) VALUES ("5ème B", 4)'
    );

    await connection.execute(
      'INSERT IGNORE INTO classes (nom, enseignant_id) VALUES ("4ème A", 1)'
    );

    await connection.execute(
      'INSERT IGNORE INTO classes (nom, enseignant_id) VALUES ("4ème B", 2)'
    );

    // 5. Insertion des élèves
    // 6ème A
    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Ndiaye", "Amadou", 1, 1)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Diallo", "Mariama", 2, 1)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Sow", "Fatima", 3, 1)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Kane", "Ibrahima", 4, 1)'
    );

    // 6ème B
    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Traore", "Aïcha", 1, 2)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Diop", "Moussa", 2, 2)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Ba", "Khadija", 3, 2)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Fall", "Ousmane", 4, 2)'
    );

    // 5ème A
    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Gueye", "Rokhaya", 1, 3)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Mbaye", "Cheikh", 2, 3)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Niang", "Aminata", 3, 3)'
    );

    await connection.execute(
      'INSERT IGNORE INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Sy", "Mamadou", 4, 3)'
    );

    res.json({ message: 'Base de données initialisée avec succès avec des données de test' });

  } catch (error) {
    console.error('Erreur initialisation DB:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation de la base de données' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route de connexion
app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    connection = await getDBConnection();

    console.log('Tentative de connexion avec:', email);

    // Recherche dans tous les types d'utilisateurs
    const query = `
      SELECT id, nom, prenom, email, password, 'admin' as role 
      FROM admins WHERE email = ?
      UNION
      SELECT id, nom, prenom, email, password, 'enseignant' as role 
      FROM enseignants WHERE email = ?
      UNION
      SELECT id, nom, prenom, email, password, 'parent' as role 
      FROM parents WHERE email = ?
    `;

    const [users] = await connection.execute(query, [email, email, email]);

    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé avec cet email');
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];

    // Vérification du mot de passe
    if (password !== user.password) {
      console.log('Mot de passe incorrect pour:', user.email);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    console.log('Connexion réussie pour:', user.email);

    // Création du token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        nom: user.nom, 
        prenom: user.prenom, 
        email: user.email, 
        role: user.role
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        nom: user.nom, 
        prenom: user.prenom, 
        email: user.email, 
        role: user.role
      } 
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour récupérer les informations de l'utilisateur connecté
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    res.json({  
      user: { 
        id: req.user.userId, 
        nom: req.user.nom, 
        prenom: req.user.prenom, 
        email: req.user.email, 
        role: req.user.role 
      } 
    });
  } catch (error) {
    console.error('Erreur me:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les parents
app.get('/api/eleves/parent/:parentId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { parentId } = req.params;
    
    // Vérification des autorisations
    if (req.user.role !== 'admin' && req.user.userId !== parseInt(parentId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [eleves] = await connection.execute(
      `SELECT e.id, e.nom, e.prenom, e.classe_id, c.nom as classe 
       FROM eleves e 
       LEFT JOIN classes c ON e.classe_id = c.id 
       WHERE e.parent_id = ?`,
      [parentId]
    );

    res.json({ eleves });

  } catch (error) {
    console.error('Erreur fetch élèves parent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Routes pour les enseignants
app.get('/api/enseignant/classes', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    
    let query = 'SELECT id, nom FROM classes';
    let params = [];
    
    if (req.user.role === 'enseignant') {
      query += ' WHERE enseignant_id = ?';
      params = [req.user.userId];
    }

    const [classes] = await connection.execute(query, params);

    res.json({ classes });

  } catch (error) {
    console.error('Erreur fetch classes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour créer un élève (ENSEIGNANT/ADMIN ONLY)
// Route pour créer un élève (ENSEIGNANT/ADMIN ONLY)
app.post('/api/eleves', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { prenom, nom, classe_id, parent_email } = req.body;
    
    if (!prenom || !nom || !classe_id || !parent_email) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    connection = await getDBConnection();

    // Vérifier si le parent existe
    const [parents] = await connection.execute(
      'SELECT id FROM parents WHERE email = ?',
      [parent_email]
    );

    let parentId;
    if (parents.length > 0) {
      parentId = parents[0].id;
    } else {
      return res.status(400).json({ error: 'Parent non trouvé avec cet email' });
    }

    // Créer l'élève
    const [result] = await connection.execute(
      'INSERT INTO eleves (nom, prenom, classe_id, parent_id) VALUES (?, ?, ?, ?)',
      [nom, prenom, classe_id, parentId]
    );

    res.status(201).json({ 
      message: 'Élève créé avec succès', 
      eleve_id: result.insertId 
    });

  } catch (error) {
    console.error('Erreur création élève:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'élève' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour modifier un élève (ENSEIGNANT/ADMIN ONLY)
app.put('/api/eleves/:id', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { id } = req.params;
    const { prenom, nom, classe_id, parent_id } = req.body;
    connection = await getDBConnection();

    await connection.execute(
      'UPDATE eleves SET nom = ?, prenom = ?, classe_id = ?, parent_id = ? WHERE id = ?',
      [nom, prenom, classe_id, parent_id, id]
    );

    res.json({ message: 'Élève modifié avec succès' });

  } catch (error) {
    console.error('Erreur modification élève:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la modification' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour supprimer un élève (ENSEIGNANT/ADMIN ONLY)
app.delete('/api/eleves/:id', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { id } = req.params;
    connection = await getDBConnection();

    await connection.execute(
      'DELETE FROM eleves WHERE id = ?',
      [id]
    );

    res.json({ message: 'Élève supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression élève:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour récupérer les élèves d'une classe
app.get('/api/classe/:classeId/eleves', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { classeId } = req.params;
    connection = await getDBConnection();

    const [eleves] = await connection.execute(
      `SELECT e.id, e.nom, e.prenom, e.parent_id, p.nom as parent_nom, p.prenom as parent_prenom 
       FROM eleves e 
       LEFT JOIN parents p ON e.parent_id = p.id 
       WHERE e.classe_id = ?`,
      [classeId]
    );

    res.json({ eleves });

  } catch (error) {
    console.error('Erreur fetch élèves classe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Routes pour les présences - Récupérer les présences par semaine
app.get('/api/presences/eleves/semaine', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { eleveIds, debut, fin } = req.query;
    
    console.log('Requête présences semaine:', { eleveIds, debut, fin });
    
    if (!eleveIds || !debut || !fin) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    // Convertir les IDs en tableau
    const ids = eleveIds.split(',').map(id => parseInt(id));
    
    connection = await getDBConnection();
    
    // Construction dynamique de la requête pour gérer plusieurs IDs
    let placeholders = ids.map(() => '?').join(',');
    const query = `
      SELECT p.*, e.nom as eleve_nom, e.prenom as eleve_prenom 
      FROM presences p 
      JOIN eleves e ON p.eleve_id = e.id 
      WHERE p.eleve_id IN (${placeholders}) AND p.date BETWEEN ? AND ? 
      ORDER BY p.date, p.eleve_id
    `;
    
    const params = [...ids, debut, fin];
    
    const [presences] = await connection.execute(query, params);

    console.log('Nombre de présences semaine trouvées:', presences.length);
    res.json({ presences });

  } catch (error) {
    console.error('Erreur fetch présences semaine:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour récupérer les présences par date et classe
app.post('/api/presences/date', authenticateToken, async (req, res) => {
  let connection;
  try {
    console.log('Requête présences date reçue:', req.body);
    
    const { date, classeId } = req.body;
    
    if (!date || !classeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Paramètres date et classeId requis' 
      });
    }

    connection = await getDBConnection();
    
    // Récupérer les présences pour la date et la classe spécifiées
    const [presences] = await connection.execute(
      `SELECT p.*, e.nom as eleve_nom, e.prenom as eleve_prenom 
       FROM presences p 
       JOIN eleves e ON p.eleve_id = e.id 
       WHERE p.date = ? AND e.classe_id = ? 
       ORDER BY e.nom, e.prenom`,
      [date, classeId]
    );

    console.log(`Nombre de présences trouvées pour ${date} et classe ${classeId}:`, presences.length);
    
    res.status(200).json({ 
      success: true, 
      data: presences 
    });

  } catch (error) {
    console.error('Erreur serveur dans /api/presences/date:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour enregistrer/mettre à jour une présence
app.post('/api/presences', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { eleve_id, date, present, heure_arrivee } = req.body;
    connection = await getDBConnection();

    // Vérifier si une présence existe déjà pour cet élève à cette date
    const [existing] = await connection.execute(
      'SELECT id FROM presences WHERE eleve_id = ? AND date = ?',
      [eleve_id, date]
    );

    if (existing.length > 0) {
      // Mettre à jour la présence existante
      await connection.execute(
        'UPDATE presences SET present = ?, heure_arrivee = ? WHERE id = ?',
        [present, heure_arrivee, existing[0].id]
      );
      res.json({ message: 'Présence mise à jour avec succès' });
    } else {
      // Créer une nouvelle présence
      await connection.execute(
        'INSERT INTO presences (eleve_id, date, present, heure_arrivee) VALUES (?, ?, ?, ?)',
        [eleve_id, date, present, heure_arrivee]
      );
      res.status(201).json({ message: 'Présence enregistrée avec succès' });
    }

  } catch (error) {
    console.error('Erreur mise à jour présence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Justifier une absence
app.put('/api/presences/:id/justifier', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { justification } = req.body;
    
    // Vérifier que l'utilisateur est un parent ou un enseignant/admin
    if (req.user.role !== 'parent' && req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    
    // Pour les parents, vérifier qu'ils ont le droit de justifier cette absence
    if (req.user.role === 'parent') {
      const [presence] = await connection.execute(
        `SELECT p.* FROM presences p 
         JOIN eleves e ON p.eleve_id = e.id 
         WHERE p.id = ? AND e.parent_id = ?`,
        [id, req.user.userId]
      );
      
      if (presence.length === 0) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }
    }

    // Mettre à jour la présence avec la justification
    await connection.execute(
      'UPDATE presences SET present = TRUE, justification = ? WHERE id = ?',
      [justification, id]
    );

    res.json({ message: 'Absence justifiée avec succès' });

  } catch (error) {
    console.error('Erreur justification absence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Notifications - Récupérer les notifications pour un enseignant
// Notifications - Récupérer les notifications pour un enseignant
// Notifications - Récupérer les notifications pour un enseignant
app.get('/api/notifications/enseignant', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    
    // Version simplifiée sans les jointures problématiques
    const [notifications] = await connection.execute(
      `SELECT n.* 
       FROM notifications n 
       WHERE n.enseignant_id = ? 
       ORDER BY n.date DESC`,
      [req.user.userId]
    );

    res.json({ notifications });

  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Notifications - Récupérer les notifications pour un parent
app.get('/api/notifications/parent', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    
    // Version simplifiée sans les jointures problématiques
    const [notifications] = await connection.execute(
      `SELECT n.* 
       FROM notifications n 
       WHERE n.parent_id = ? 
       ORDER BY n.date DESC`,
      [req.user.userId]
    );

    res.json({ notifications });

  } catch (error) {
    console.error('Erreur récupération notifications parent:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Notifications - Récupérer toutes les notifications (ADMIN ONLY)
app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    
    // Version simplifiée sans les jointures problématiques
    const [notifications] = await connection.execute(
      `SELECT n.* 
       FROM notifications n 
       ORDER BY n.date DESC`
    );

    res.json({ notifications });

  } catch (error) {
    console.error('Erreur récupération notifications admin:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  } finally {
    if (connection) await connection.end();
  }
});
// Notifications - Créer une notification (pour enseignant/admin)
app.post('/api/notifications', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { eleve_id, parent_id, message, type } = req.body;
    connection = await getDBConnection();

    await connection.execute(
      'INSERT INTO notifications (enseignant_id, eleve_id, parent_id, message, type, date) VALUES (?, ?, ?, ?, ?, NOW())',
      [req.user.userId, eleve_id, parent_id, message, type || 'autre']
    );

    res.status(201).json({ message: 'Notification créée avec succès' });

  } catch (error) {
    console.error('Erreur création notification:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  } finally {
    if (connection) await connection.end();
  }
});

// Notifications - Marquer une notification comme lue
app.put('/api/notifications/:id/lire', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await getDBConnection();

    await connection.execute(
      'UPDATE notifications SET lue = TRUE WHERE id = ?',
      [id]
    );

    res.json({ message: 'Notification marquée comme lue' });

  } catch (error) {
    console.error('Erreur marquer notification comme lue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Notifications - Récupérer toutes les notifications (ADMIN ONLY)
app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [notifications] = await connection.execute(
      `SELECT n.*, e.nom as eleve_nom, e.prenom as eleve_prenom, 
              p.nom as parent_nom, p.prenom as parent_prenom,
              ens.nom as enseignant_nom, ens.prenom as enseignant_prenom
       FROM notifications n 
       LEFT JOIN eleves e ON n.eleve_id = e.id 
       LEFT JOIN parents p ON n.parent_id = p.id
       LEFT JOIN enseignants ens ON n.enseignant_id = ens.id
       ORDER BY n.date DESC`
    );

    res.json({ notifications });

  } catch (error) {
    console.error('Erreur récupération notifications admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour récupérer tous les parents
app.get('/api/parents', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [parents] = await connection.execute(
      'SELECT id, nom, prenom, email FROM parents ORDER BY nom, prenom'
    );

    res.json({ parents });

  } catch (error) {
    console.error('Erreur fetch parents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

// Routes d'administration
app.get('/api/admin/enseignants', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [enseignants] = await connection.execute(
      'SELECT id, nom, prenom, email FROM enseignants ORDER BY nom, prenom'
    );

    res.json({ enseignants });

  } catch (error) {
    console.error('Erreur fetch enseignants:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

app.post('/api/admin/enseignants', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { nom, prenom, email, password } = req.body;
    
    connection = await getDBConnection();

    await connection.execute(
      'INSERT INTO enseignants (nom, prenom, email, password) VALUES (?, ?, ?, ?)',
      [nom, prenom, email, password]
    );

    res.status(201).json({ message: 'Enseignant créé avec succès' });

  } catch (error) {
    console.error('Erreur création enseignant:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  } finally {
    if (connection) await connection.end();
  }
});

app.delete('/api/admin/enseignants/:id', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { id } = req.params;
    connection = await getDBConnection();

    await connection.execute(
      'DELETE FROM enseignants WHERE id = ?',
      [id]
    );

    res.json({ message: 'Enseignant supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression enseignant:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  } finally {
    if (connection) await connection.end();
  }
});

// Route pour vérifier l'état du serveur
app.get('/api/health', async (req, res) => {
  try {
    const connection = await getDBConnection();
    await connection.end();
    res.json({ 
      status: 'OK', 
      message: 'Serveur et base de données fonctionnent', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Problème de connexion à la base de données', 
      error: error.message 
    });
  }
});

// Route pour réinitialiser la base de données (pour le développement)
app.post('/api/reset-db', async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    
    // Supprimer toutes les tables (attention: cette opération efface toutes les données)
    await connection.execute('DROP TABLE IF EXISTS notifications');
    await connection.execute('DROP TABLE IF EXISTS presences');
    await connection.execute('DROP TABLE IF EXISTS eleves');
    await connection.execute('DROP TABLE IF EXISTS classes');
    await connection.execute('DROP TABLE IF EXISTS parents');
    await connection.execute('DROP TABLE IF EXISTS enseignants');
    await connection.execute('DROP TABLE IF EXISTS admins');
    
    // Réinitialiser la base de données
    await connection.execute(`
      CREATE TABLE admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE enseignants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE parents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        enseignant_id INT,
        FOREIGN KEY (enseignant_id) REFERENCES enseignants(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE eleves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        classe_id INT,
        parent_id INT,
        FOREIGN KEY (classe_id) REFERENCES classes(id),
        FOREIGN KEY (parent_id) REFERENCES parents(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE presences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eleve_id INT,
        date DATE NOT NULL,
        present BOOLEAN DEFAULT FALSE,
        heure_arrivee TIME,
        justification TEXT,
        FOREIGN KEY (eleve_id) REFERENCES eleves(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enseignant_id INT,
        eleve_id INT,
        parent_id INT,
        message TEXT NOT NULL,
        type ENUM('absence', 'retard', 'autre') DEFAULT 'autre',
        date DATETIME NOT NULL,
        lue BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (enseignant_id) REFERENCES enseignants(id),
        FOREIGN KEY (eleve_id) REFERENCES eleves(id),
        FOREIGN KEY (parent_id) REFERENCES parents(id)
      )
    `);

    // Insérer les données de test
    await connection.execute(
      'INSERT INTO admins (id, nom, prenom, email, password) VALUES (1, "Admin", "System", "admin@ecole.fr", "admin123")'
    );
    
    await connection.execute(
      'INSERT INTO enseignants (nom, prenom, email, password) VALUES ("Kone", "Fatou", "fatou.kone@mail.com", "1234")'
    );

    await connection.execute(
      'INSERT INTO enseignants (nom, prenom, email, password) VALUES ("Traore", "Ibrahim", "ibrahim.traore@mail.com", "4567")'
    );

    await connection.execute(
      'INSERT INTO enseignants (nom, prenom, email, password) VALUES ("Diop", "Mariama", "mariama.diop@mail.com", "7890")'
    );

    await connection.execute(
      'INSERT INTO enseignants (nom, prenom, email, password) VALUES ("Ba", "Modou", "modou.ba@mail.com", "1011")'
    );

    await connection.execute(
      'INSERT INTO parents (nom, prenom, email, password) VALUES ("Ndiaye", "Awa", "awa.ndiaye@mail.com", "password1")'
    );

    await connection.execute(
      'INSERT INTO parents (nom, prenom, email, password) VALUES ("Diallo", "Moussa", "moussa.diallo@mail.com", "password2")'
    );

    await connection.execute(
      'INSERT INTO parents (nom, prenom, email, password) VALUES ("Kane", "Aminata", "amina.kane@mail.com", "password3")'
    );

    await connection.execute(
      'INSERT INTO parents (nom, prenom, email, password) VALUES ("Sow", "Abdoulaye", "abdoul.sow@mail.com", "password4")'
    );

    await connection.execute(
      'INSERT INTO classes (nom, enseignant_id) VALUES ("6ème A", 1)'
    );

    await connection.execute(
      'INSERT INTO classes (nom, enseignant_id) VALUES ("6ème B", 2)'
    );

    await connection.execute(
      'INSERT INTO classes (nom, enseignant_id) VALUES ("5ème A", 3)'
    );

    await connection.execute(
      'INSERT INTO classes (nom, enseignant_id) VALUES ("5ème B", 4)'
    );

    await connection.execute(
      'INSERT INTO classes (nom, enseignant_id) VALUES ("4ème A", 1)'
    );

    await connection.execute(
      'INSERT INTO classes (nom, enseignant_id) VALUES ("4ème B", 2)'
    );

    // Insérer les élèves
    // 6ème A
    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Ndiaye", "Amadou", 1, 1)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Diallo", "Mariama", 2, 1)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Sow", "Fatima", 3, 1)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Kane", "Ibrahima", 4, 1)'
    );

    // 6ème B
    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Traore", "Aïcha", 1, 2)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Diop", "Moussa", 2, 2)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Ba", "Khadija", 3, 2)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Fall", "Ousmane", 4, 2)'
    );

    // 5ème A
    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Gueye", "Rokhaya", 1, 3)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Mbaye", "Cheikh", 2, 3)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Niang", "Aminata", 3, 3)'
    );

    await connection.execute(
      'INSERT INTO eleves (nom, prenom, parent_id, classe_id) VALUES ("Sy", "Mamadou", 4, 3)'
    );

    // Ajouter quelques notifications de test
    await connection.execute(
      'INSERT INTO notifications (enseignant_id, eleve_id, parent_id, message, type, date) VALUES (1, 1, 1, "Absence non justifiée", "absence", NOW())'
    );

    await connection.execute(
      'INSERT INTO notifications (enseignant_id, eleve_id, parent_id, message, type, date) VALUES (1, 2, 2, "Retard important ce matin", "retard", NOW())'
    );

    await connection.execute(
      'INSERT INTO notifications (enseignant_id, eleve_id, parent_id, message, type, date) VALUES (2, 5, 1, "Élève félicité pour son travail", "autre", NOW())'
    );

    res.json({ message: 'Base de données réinitialisée avec succès' });

  } catch (error) {
    console.error('Erreur réinitialisation DB:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation de la base de données' });
  } finally {
    if (connection) await connection.end();
  }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
  console.error('Erreur globale:', error);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 API disponible: http://localhost:${PORT}/api`);
  console.log(`📊 Connexion DB: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`👤 Comptes disponibles:`);
  console.log(`   - Admin: admin@ecole.fr / admin123`);
  console.log(`   - Enseignant: fatou.kone@mail.com / 1234`);
  console.log(`   - Parent: awa.ndiaye@mail.com / password1`);
  console.log(`📋 Initialisez la base de données avec: POST http://localhost:${PORT}/api/init-db`);
});

export default app;