import express from 'express';
import { db } from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = express.Router();

// 🔹 Batch présences
router.post('/batch', verifyToken, async (req, res) => {
  const { eleveIds } = req.body;
  try {
    const [presences] = await db.query(
      'SELECT * FROM presences WHERE eleve_id IN (?) AND date = CURDATE()',
      [eleveIds]
    );
    res.json({ presences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 🔹 Marquer présence
router.put('/:eleveId', verifyToken, async (req, res) => {
  const { eleveId } = req.params;
  const { present } = req.body;
  try {
    const [rows] = await db.query('SELECT id FROM presences WHERE eleve_id=? AND date=CURDATE()', [eleveId]);
    if (rows.length > 0) {
      await db.query('UPDATE presences SET present=? WHERE id=?', [present, rows[0].id]);
    } else {
      await db.query('INSERT INTO presences (eleve_id, date, present) VALUES (?, CURDATE(), ?)', [eleveId, present]);
    }
    res.json({ message: 'Présence mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
