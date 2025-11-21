import express from 'express';
import { db } from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = express.Router();

// Élèves d'un parent
router.get('/parent/:id', verifyToken, async (req, res) => {
  const parentId = parseInt(req.params.id);
  if (req.user.role !== 'parent' || req.user.id !== parentId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  try {
    const [rows] = await db.query(
      `SELECT e.id, e.nom, e.prenom, c.nom AS classe 
       FROM eleves e 
       LEFT JOIN classes c ON e.classe_id=c.id
       WHERE e.parent_id=?`, [parentId]
    );
    res.json({ eleves: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur base de données' });
  }
});

// Élèves d'une classe
router.get('/classe/:id/eleves', verifyToken, async (req, res) => {
  const classeId = parseInt(req.params.id);
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.nom, e.prenom, c.nom AS classe 
       FROM eleves e
       LEFT JOIN classes c ON e.classe_id=c.id
       WHERE e.classe_id=?`, [classeId]
    );
    res.json({ eleves: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur base de données' });
  }
});

// Classes d'un enseignant
router.get('/enseignant/classes', verifyToken, async (req, res) => {
  if (req.user.role !== 'enseignant') return res.status(403).json({ error: 'Accès enseignant uniquement' });
  try {
    const [rows] = await db.query('SELECT id, nom FROM classes WHERE enseignant_id=?', [req.user.id]);
    res.json({ classes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur base de données' });
  }
});

export default router;
