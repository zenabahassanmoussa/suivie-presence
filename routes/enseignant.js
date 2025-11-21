import express from 'express';
import { verifyToken } from './auth.js';
import { db } from '../db.js';

const router = express.Router();

// Classes d'un enseignant
router.get('/enseignant/classes', verifyToken, async (req, res) => {
  try {
    const enseignantId = req.user.id;
    
    if (req.user.role !== 'enseignant') {
      return res.status(403).json({ error: 'Accès réservé aux enseignants' });
    }

    const query = 'SELECT id, nom FROM classes WHERE enseignant_id = ?';
    const [rows] = await db.query(query, [enseignantId]);
    
    res.json({ classes: rows });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;