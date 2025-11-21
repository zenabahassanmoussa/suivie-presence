import express from 'express';
import { db } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET_KEY = 'votre_clef_secrete';

// Login parent / enseignant
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email=? AND role=?', [email, role]);
    const user = rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer l'utilisateur connecté
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const [rows] = await db.query('SELECT id, nom, prenom, email, role FROM users WHERE id=?', [decoded.id]);
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: 'Token invalide' });
  }
});

export default router;
