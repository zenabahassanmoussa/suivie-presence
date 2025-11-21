import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createConnection } from 'mysql2/promise';

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
      return res.status(401).json({ error: 'Token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();

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

// Routes d'authentification
app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    connection = await getDBConnection();
    
    let table, user;
    
    if (role === 'parent') {
      table = 'parents';
      const [parents] = await connection.execute(
        'SELECT * FROM parents WHERE email = ?',
        [email]
      );
      user = parents[0];
    } else if (role === 'enseignant') {
      table = 'enseignants';
      const [enseignants] = await connection.execute(
        'SELECT * FROM enseignants WHERE email = ?',
        [email]
      );
      user = enseignants[0];
    } else {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérification simple du mot de passe
    if (password !== user.password) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: role,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: role
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

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

    // Vérifier les permissions
    if (req.user.role !== 'enseignant' && req.user.userId !== parseInt(parentId)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [eleves] = await connection.execute(
      `SELECT e.id, e.nom, e.prenom, e.parent_id, c.nom as classe, c.id as classe_id
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
    if (req.user.role !== 'enseignant') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [classes] = await connection.execute(
      'SELECT id, nom, enseignant_id FROM classes WHERE enseignant_id = ?',
      [req.user.userId]
    );

    res.json({ classes });

  } catch (error) {
    console.error('Erreur fetch classes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/classe/:classeId/eleves', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { classeId } = req.params;

    if (req.user.role !== 'enseignant') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    connection = await getDBConnection();
    const [eleves] = await connection.execute(
      `SELECT e.id, e.nom, e.prenom, e.parent_id, c.nom as classe, c.id as classe_id
       FROM eleves e 
       LEFT JOIN classes c ON e.classe_id = c.id 
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

// Routes pour les présences
app.get('/api/presences/eleves/semaine', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { eleveIds, debut, fin } = req.query;
    
    if (!eleveIds || !debut || !fin) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    const eleveIdsArray = eleveIds.split(',').map(id => parseInt(id));
    
    if (eleveIdsArray.length === 0) {
      return res.json({ presences: [] });
    }

    const placeholders = eleveIdsArray.map(() => '?').join(',');

    connection = await getDBConnection();
    const [presences] = await connection.execute(
      `SELECT id, eleve_id, date, present, heure_arrivee
       FROM presences 
       WHERE eleve_id IN (${placeholders}) 
       AND date BETWEEN ? AND ? 
       ORDER BY date`,
      [...eleveIdsArray, debut, fin]
    );

    // Formater les données pour correspondre au frontend
    const formattedPresences = presences.map(p => ({
      ...p,
      date: new Date(p.date).toISOString().split('T')[0],
      heure_arrivee: p.heure_arrivee ? p.heure_arrivee.toString() : null
    }));

    res.json({ presences: formattedPresences });

  } catch (error) {
    console.error('Erreur fetch présences semaine:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

app.post('/api/presences/date', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { eleveIds, date } = req.body;

    if (!eleveIds || !date || !Array.isArray(eleveIds)) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    if (req.user.role !== 'enseignant') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const placeholders = eleveIds.map(() => '?').join(',');

    connection = await getDBConnection();
    const [presences] = await connection.execute(
      `SELECT id, eleve_id, date, present, heure_arrivee
       FROM presences 
       WHERE eleve_id IN (${placeholders}) 
       AND date = ?`,
      [...eleveIds, date]
    );

    // Formater les données
    const formattedPresences = presences.map(p => ({
      ...p,
      date: new Date(p.date).toISOString().split('T')[0],
      heure_arrivee: p.heure_arrivee ? p.heure_arrivee.toString() : null
    }));

    res.json({ presences: formattedPresences });

  } catch (error) {
    console.error('Erreur fetch présences date:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

app.post('/api/presences', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { eleve_id, date, present } = req.body;

    if (!eleve_id || !date || present === undefined) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    connection = await getDBConnection();

    // Vérifier si une présence existe déjà
    const [existing] = await connection.execute(
      'SELECT id FROM presences WHERE eleve_id = ? AND date = ?',
      [eleve_id, date]
    );

    let heure_arrivee = null;
    if (present) {
      heure_arrivee = new Date().toTimeString().split(' ')[0];
    }

    if (existing.length > 0) {
      // Mettre à jour la présence existante
      await connection.execute(
        'UPDATE presences SET present = ?, heure_arrivee = ? WHERE eleve_id = ? AND date = ?',
        [present, heure_arrivee, eleve_id, date]
      );
    } else {
      // Créer une nouvelle présence
      await connection.execute(
        'INSERT INTO presences (eleve_id, date, present, heure_arrivee) VALUES (?, ?, ?, ?)',
        [eleve_id, date, present, heure_arrivee]
      );
    }

    // Récupérer la présence mise à jour/créée
    const [updatedPresence] = await connection.execute(
      'SELECT id, eleve_id, date, present, heure_arrivee FROM presences WHERE eleve_id = ? AND date = ?',
      [eleve_id, date]
    );

    const presence = updatedPresence[0];
    const formattedPresence = {
      ...presence,
      date: new Date(presence.date).toISOString().split('T')[0],
      heure_arrivee: presence.heure_arrivee ? presence.heure_arrivee.toString() : null
    };

    res.json({ 
      message: 'Présence mise à jour avec succès',
      presence: formattedPresence
    });

  } catch (error) {
    console.error('Erreur mise à jour présence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (connection) await connection.end();
  }
});

app.put('/api/presences/:id', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (req.user.role !== 'enseignant') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { id } = req.params;
    const { present } = req.body;

    if (present === undefined) {
      return res.status(400).json({ error: 'Paramètre présent requis' });
    }

    connection = await getDBConnection();

    let heure_arrivee = null;
    if (present) {
      heure_arrivee = new Date().toTimeString().split(' ')[0];
    }

    await connection.execute(
      'UPDATE presences SET present = ?, heure_arrivee = ? WHERE id = ?',
      [present, heure_arrivee, id]
    );

    // Récupérer la présence mise à jour
    const [updatedPresence] = await connection.execute(
      'SELECT id, eleve_id, date, present, heure_arrivee FROM presences WHERE id = ?',
      [id]
    );

    const presence = updatedPresence[0];
    const formattedPresence = {
      ...presence,
      date: new Date(presence.date).toISOString().split('T')[0],
      heure_arrivee: presence.heure_arrivee ? presence.heure_arrivee.toString() : null
    };

    res.json({ 
      message: 'Présence mise à jour avec succès',
      presence: formattedPresence
    });

  } catch (error) {
    console.error('Erreur mise à jour présence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
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
  console.log(`👤 Comptes de test:`);
  console.log(`   - Enseignant: fatou.kone@mail.com / 1234`);
  console.log(`   - Parent: awa.ndiaye@mail.com / password1`);
  console.log(`   - Autres comptes: voir base de données`);
});

export default app;