require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt'); 

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// TEST
app.get('/', (req, res) => {
  res.send(' Backend Gasipro Quiz fonctionne !');
});

// ======================================================================
// CLASSES
// ======================================================================
app.get('/classes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nom FROM classes ORDER BY id ASC');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur en récupérant les classes:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/classes', async (req, res) => {
  const { nom } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'Nom de la classe requis' });

  try {
    const [count] = await pool.query('SELECT COUNT(*) AS total FROM classes');
    if (count[0].total >= 25)
      return res.status(400).json({ error: 'Limite atteinte : max 25 classes' });

    const [result] = await pool.query('INSERT INTO classes (nom) VALUES (?)', [nom.trim()]);
    res.status(201).json({ message: 'Classe ajoutée avec succès', id: result.insertId });
  } catch (err) {
    console.error('Erreur ajout classe:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Vérification
    const [rows] = await pool.query('SELECT * FROM classes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Classe introuvable' });
    }

    // Supprimer une classe
    await pool.query('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ message: 'Classe supprimée avec succès' });
  } catch (err) {
    console.error('Erreur suppression classe:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === MODIFICATION ===
app.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { nom } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'Nom requis' });

  try {
    const [result] = await pool.query('UPDATE classes SET nom = ? WHERE id = ?', [nom.trim(), id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Classe introuvable' });
    res.json({ message: 'Classe modifiée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// ÉTABLISSEMENTS
// ======================================================================
app.get('/etablissements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nom FROM etablissements ORDER BY nom ASC');
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /etablissements:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/etablissements', async (req, res) => {
  let { nom } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'Nom requis' });
  nom = nom.trim().toUpperCase();

  try {
    const [exist] = await pool.query('SELECT id FROM etablissements WHERE nom = ?', [nom]);
    if (exist.length > 0) return res.status(400).json({ error: 'Déjà existant' });

    const [result] = await pool.query('INSERT INTO etablissements (nom) VALUES (?)', [nom]);
    res.status(201).json({ message: 'Ajouté', id: result.insertId, nom });
  } catch (err) {
    console.error('Erreur POST /etablissements:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/etablissements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users WHERE etablissement_id = ?', [id]);
    if (users[0].count > 0) {
      return res.status(400).json({ error: `Utilisé par ${users[0].count} utilisateur(s)` });
    }
    const [result] = await pool.query('DELETE FROM etablissements WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Introuvable' });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    console.error('Erreur DELETE /etablissements:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// MATIÈRES
// ======================================================================
app.get('/matieres/:class_id', async (req, res) => {
  const { class_id } = req.params;
  if (!class_id || isNaN(class_id))
    return res.status(400).json({ error: 'ID de classe invalide' });

  try {
    const [rows] = await pool.query(
      'SELECT id, nom FROM matieres WHERE class_id = ? ORDER BY id ASC',
      [class_id]
      );
    res.json(rows);
  } catch (err) {
    console.error('Erreur en récupérant les matières:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/matieres', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nom, class_id FROM matieres ORDER BY class_id, id');
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /matieres:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/matieres', async (req, res) => {
  const { class_id, nom } = req.body;
  if (!class_id || !nom?.trim())
    return res.status(400).json({ error: 'Classe et nom requis' });

  try {
    const [count] = await pool.query(
      'SELECT COUNT(*) AS total FROM matieres WHERE class_id = ?',
      [class_id]
      );
    if (count[0].total >= 15)
      return res.status(400).json({ error: 'Limite atteinte : max 15 matières' });

    const [result] = await pool.query(
      'INSERT INTO matieres (class_id, nom) VALUES (?, ?)',
      [class_id, nom.trim()]
      );
    res.status(201).json({ message: 'Matière ajoutée avec succès', id: result.insertId });
  } catch (err) {
    console.error('Erreur ajout matière:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === MATIÈRES - SUPPRIMER ===
app.delete('/matieres/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM matieres WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Matière introuvable' });
    res.json({ message: 'Matière supprimée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// QUESTIONS — PUZZLE CORRIGÉ (ordre_correct)
// ======================================================================

app.get('/quiz/:quiz_id/questions', async (req, res) => {
  const { quiz_id } = req.params;
  try {
    const [questions] = await pool.query(`
      SELECT id, question_text, type, temps, ordre, image_url, bonne_reponse
      FROM questions
      WHERE quiz_id = ? AND status = 'active'
      ORDER BY ordre, id
    `, [quiz_id]);

    const result = await Promise.all(questions.map(async (q) => {
      let reponses = [];
      if (['qcm', 'puzzle', 'truefalse'].includes(q.type)) {
        const [resp] = await pool.query(
          'SELECT choice_index, reponse_text, est_correct, ordre_correct FROM reponses WHERE question_id = ? ORDER BY choice_index',
          [q.id]
          );
        reponses = resp.length > 0 ? resp : (
          q.type === 'truefalse' ? [
            { choice_index: 1, reponse_text: 'Vrai', est_correct: q.bonne_reponse == 1 ? 1 : 0, ordre_correct: null },
            { choice_index: 2, reponse_text: 'Faux', est_correct: q.bonne_reponse == 2 ? 1 : 0, ordre_correct: null }
          ] : []
          );
      }
      return {
        id: q.id,
        question_text: q.question_text,
        type: q.type,
        temps: q.temps,
        ordre: q.ordre,
        image_url: q.image_url,
        reponses,
        bonne_reponse: q.type === 'text' ? q.bonne_reponse : null
      };
    }));
    res.json(result);
  } catch (err) {
    console.error('Erreur GET /questions:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une question
app.post('/questions', async (req, res) => {
  const {
    quiz_id, question_text, type = 'qcm', temps = 30, ordre = 0,
    reponse1, reponse2, reponse3, reponse4, bonne_reponse, image_url,
    ordre_correct = [1, 2, 3, 4] // ← NOUVEAU : ordre attendu
  } = req.body;

  if (!quiz_id || !question_text?.trim()) {
    return res.status(400).json({ error: 'quiz_id et question_text requis' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [quizCheck] = await conn.query('SELECT matiere_id FROM quiz WHERE id = ?', [quiz_id]);
    if (quizCheck.length === 0) throw new Error('Quiz introuvable');
    const matiere_id = quizCheck[0].matiere_id;

    const [qResult] = await conn.query(`
      INSERT INTO questions
      (quiz_id, matiere_id, question_text, type, temps, ordre, image_url, bonne_reponse, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        quiz_id, matiere_id, question_text.trim(), type, temps, ordre,
        image_url || null, type === 'text' ? bonne_reponse?.trim() : null
      ]);

    const questionId = qResult.insertId;

    if (['qcm', 'puzzle', 'truefalse'].includes(type)) {
      const responses = type === 'truefalse'
      ? [
        { i: 1, txt: 'Vrai', ok: bonne_reponse == 1, ord: null },
        { i: 2, txt: 'Faux', ok: bonne_reponse == 2, ord: null }
      ]
      : [
        { i: 1, txt: reponse1?.trim(), ok: bonne_reponse == 1, ord: ordre_correct[0] },
        { i: 2, txt: reponse2?.trim(), ok: bonne_reponse == 2, ord: ordre_correct[1] },
        { i: 3, txt: reponse3?.trim(), ok: bonne_reponse == 3, ord: ordre_correct[2] },
        { i: 4, txt: reponse4?.trim(), ok: bonne_reponse == 4, ord: ordre_correct[3] }
      ];

      if (type !== 'truefalse' && responses.some(r => !r.txt)) {
        throw new Error('Les 4 réponses sont requises pour QCM/Puzzle');
      }

      for (const r of responses) {
        await conn.query(
          'INSERT INTO reponses (question_id, choice_index, reponse_text, est_correct, ordre_correct) VALUES (?, ?, ?, ?, ?)',
          [questionId, r.i, r.txt, r.ok ? 1 : 0, r.ord]
          );
      }
    }

    await conn.commit();
    res.status(201).json({ id: questionId });
  } catch (err) {
    await conn.rollback();
    console.error('Erreur POST /questions:', err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Modifi une question
app.put('/questions/:id', async (req, res) => {
  const { id } = req.params;
  const {
    question_text, type = 'qcm', temps = 30, ordre = 0,
    reponse1, reponse2, reponse3, reponse4, bonne_reponse, image_url,
    ordre_correct = [1, 2, 3, 4]
  } = req.body;

  if (!question_text?.trim()) {
    return res.status(400).json({ error: 'question_text requis' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`
      UPDATE questions SET
      question_text = ?, type = ?, temps = ?, ordre = ?, image_url = ?,
      bonne_reponse = ?
      WHERE id = ? AND status = 'active'
      `, [
        question_text.trim(),
        type,
        temps,
        ordre,
        image_url || null,
        type === 'text' ? (bonne_reponse?.trim() || null) : null,
        id
      ]);

    if (['qcm', 'puzzle', 'truefalse'].includes(type)) {
      await conn.query('DELETE FROM reponses WHERE question_id = ?', [id]);

      let responses = [];
      if (type === 'truefalse') {
        responses = [
          { i: 1, txt: 'Vrai', ok: bonne_reponse == 1, ord: null },
          { i: 2, txt: 'Faux', ok: bonne_reponse == 2, ord: null }
        ];
      } else {
        if (reponse1?.trim() && reponse2?.trim() && reponse3?.trim() && reponse4?.trim()) {
          responses = [
            { i: 1, txt: reponse1.trim(), ok: bonne_reponse == 1, ord: ordre_correct[0] },
            { i: 2, txt: reponse2.trim(), ok: bonne_reponse == 2, ord: ordre_correct[1] },
            { i: 3, txt: reponse3.trim(), ok: bonne_reponse == 3, ord: ordre_correct[2] },
            { i: 4, txt: reponse4.trim(), ok: bonne_reponse == 4, ord: ordre_correct[3] }
          ];
        } else {
          const [old] = await conn.query(
            'SELECT choice_index, reponse_text FROM reponses WHERE question_id = ? ORDER BY choice_index',
            [id]
            );
          if (old.length !== 4) throw new Error('Réponses anciennes manquantes');
          responses = old.map((r, idx) => ({
            i: r.choice_index,
            txt: r.reponse_text,
            ok: r.choice_index == bonne_reponse,
            ord: ordre_correct[idx]
          }));
        }
      }

      for (const r of responses) {
        await conn.query(
          'INSERT INTO reponses (question_id, choice_index, reponse_text, est_correct, ordre_correct) VALUES (?, ?, ?, ?, ?)',
          [id, r.i, r.txt, r.ok ? 1 : 0, r.ord]
          );
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Erreur PUT /questions:', err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Supprimer
app.delete('/questions/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM reponses WHERE question_id = ?', [id]);
    await conn.query('DELETE FROM questions WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Erreur DELETE /questions:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    conn.release();
  }
});

// ======================================================================
// PINS — ADMIN PANEL (actifs + désactivés)
// ======================================================================
const pinCache = new Map();

// Récupérer tous les PIN (admin)
app.get('/admin/pins', async (req, res) => {
  try {
    if (pinCache.has('all')) return res.json(pinCache.get('all'));
    const [rows] = await pool.query(`
      SELECT p.id, p.code, p.description, p.is_active, p.used_by, p.used_at,
             u.nom AS used_by_name
      FROM pin_codes p
      LEFT JOIN users u ON p.used_by = u.id
      ORDER BY p.id ASC
    `);
    pinCache.set('all', rows);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /admin/pins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un PIN
app.post('/pins', async (req, res) => {
  const { code, description } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code requis' });

  try {
    const [exist] = await pool.query('SELECT id FROM pin_codes WHERE code = ?', [code.trim()]);
    if (exist.length > 0) return res.status(400).json({ error: 'Ce PIN existe déjà' });

    const [result] = await pool.query(
      'INSERT INTO pin_codes (code, description, is_active) VALUES (?, ?, 1)',
      [code.trim(), description?.trim() || null]
    );

    pinCache.delete('all');
    res.status(201).json({ message: 'PIN créé', id: result.insertId });
  } catch (err) {
    console.error('Erreur POST /pins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/pins/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active requis' });

  try {
    const [result] = await pool.query(
      'UPDATE pin_codes SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'PIN introuvable' });

    pinCache.delete('all');
    res.json({ message: is_active ? 'PIN activé' : 'PIN désactivé' });
  } catch (err) {
    console.error('Erreur PUT /pins/status:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// raha tsy amppiasaina
app.delete('/pins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users WHERE pin_id = ?', [id]);
    if (users[0].count > 0) {
      return res.status(400).json({ error: `Ce PIN est utilisé par ${users[0].count} utilisateur(s). Supprimez-les d’abord.` });
    }

    const [result] = await pool.query('DELETE FROM pin_codes WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'PIN introuvable' });

    pinCache.delete('all');
    res.json({ message: 'PIN supprimé' });
  } catch (err) {
    console.error('Erreur DELETE /pins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// USERS 
// ======================================================================

// Inscription
app.post('/users/register', async (req, res) => {
  const { nom, etablissement_id, class_id, pin_code } = req.body;
  if (![nom, etablissement_id, class_id, pin_code].every(Boolean)) {
    return res.status(400).json({ error: 'Tous les champs requis' });
  }
  try {
    const [etab] = await pool.query('SELECT id FROM etablissements WHERE id = ?', [etablissement_id]);
    if (etab.length === 0) return res.status(400).json({ error: 'Établissement invalide' });

    const [pins] = await pool.query('SELECT id FROM pin_codes WHERE code = ? AND is_active = 1', [pin_code]);
    if (pins.length === 0) return res.status(400).json({ error: 'PIN invalide ou désactivé' });
    const pin_id = pins[0].id;

    const identifiant = 'U' + Date.now().toString().slice(-6);
    const [result] = await pool.query(
      'INSERT INTO users (identifiant, nom, etablissement_id, class_id, pin_id) VALUES (?, ?, ?, ?, ?)',
      [identifiant, nom.trim(), +etablissement_id, +class_id, pin_id]
    );

    await pool.query('INSERT INTO user_pin_logs (user_id, pin_id) VALUES (?, ?)', [result.insertId, pin_id]);
    res.status(201).json({ identifiant });
  } catch (err) {
    console.error('Erreur register:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === back-end ===
app.post('/users/login', async (req, res) => {
  const { identifiant, pin_code } = req.body;
  if (!identifiant || !pin_code) return res.status(400).json({ error: 'Identifiant et PIN requis' });

  try {
    const [rows] = await pool.query(`
      SELECT
        u.id, 
        u.nom, 
        u.identifiant,
        u.class_id,                    
        e.nom AS etablissement,
        c.nom AS classe,
        p.code AS pin_code,
        p.is_active
      FROM users u
      LEFT JOIN etablissements e ON u.etablissement_id = e.id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN pin_codes p ON u.pin_id = p.id
      WHERE u.identifiant = ? AND p.code = ?
    `, [identifiant, pin_code]);

    if (rows.length === 0) return res.status(400).json({ error: 'Identifiant ou PIN incorrect' });

    const user = rows[0];
    if (!user.is_active) return res.status(400).json({ error: 'PIN désactivé. Contactez l’admin.' });

    res.json(user); 
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// Liste des users (admin)
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.identifiant, u.nom,
        e.nom AS etablissement,
        c.nom AS classe,
        p.code AS pin_code
      FROM users u
      LEFT JOIN etablissements e ON u.etablissement_id = e.id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN pin_codes p ON u.pin_id = p.id
      ORDER BY u.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /users:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// SUPPRIMER UN USER (admin)
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    await pool.query('DELETE FROM user_pin_logs WHERE user_id = ?', [id]);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('Erreur DELETE /users:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ====================
// LOGIN ADMIN 
// ====================
app.post('/admin/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Mot de passe requis' });

  try {
    const [logged] = await pool.query('SELECT id FROM admins WHERE is_logged_in = 1');
    if (logged.length > 0) {
      return res.status(403).json({ error: 'Un admin est déjà connecté. Déconnexion requise.' });
    }
    const [admins] = await pool.query('SELECT id, username, password_hash FROM admins');
    const admin = admins.find(a => bcrypt.compareSync(password, a.password_hash));

    if (!admin) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    await pool.query('UPDATE admins SET is_logged_in = 1 WHERE id = ?', [admin.id]);
    res.json({
      message: 'Connexion réussie',
      admin: { id: admin.id, username: admin.username }
    });
  } catch (err) {
    console.error('Erreur login admin:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ====================
// LOGOUT ADMIN
// ====================
app.post('/admin/logout', async (req, res) => {
  const { admin_id } = req.body;
  if (!admin_id) return res.status(400).json({ error: 'ID admin requis' });

  try {
    await pool.query('UPDATE admins SET is_logged_in = 0 WHERE id = ?', [admin_id]);
    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    console.error('Erreur logout:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ====================
// ADMIN PIN MANAGEMENT
// ====================
app.get('/admin/pins/active', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, code, description, is_active FROM pin_codes WHERE is_active = 1 ORDER BY id ASC'
      );
    res.json(rows);
  } catch (err) {
    console.error('Erreur récupération PIN actifs:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/admin/pins/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean' && typeof is_active !== 'number') {
    return res.status(400).json({ error: 'is_active doit être un booléen ou 0/1' });
  }

  try {
    const [result] = await pool.query('UPDATE pin_codes SET is_active = ? WHERE id = ?', [
      is_active ? 1 : 0,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'PIN introuvable' });
    }

    res.json({ message: `PIN ${is_active ? 'activé' : 'désactivé'} avec succès` });
  } catch (err) {
    console.error('Erreur mise à jour PIN:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/admin/pins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM pin_codes WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'PIN introuvable' });

    res.json({ message: 'PIN supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression PIN:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Endpoint pour créer un nouveau PIN
app.post('/admin/pins', async (req, res) => {
  const { code, description } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code PIN requis' });

  try {
    const [exist] = await pool.query('SELECT id FROM pin_codes WHERE code = ?', [code.trim()]);
    if (exist.length > 0) return res.status(400).json({ error: 'Ce PIN existe déjà' });

    const [result] = await pool.query(
      'INSERT INTO pin_codes (code, description, is_active) VALUES (?, ?, 1)',
      [code.trim(), description || null]
      );

    res.status(201).json({ message: 'PIN créé avec succès', id: result.insertId });
  } catch (err) {
    console.error('Erreur création PIN:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const multer = require('multer');
const path = require('path');

// Configuration du stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'assets/img/questions');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtrage
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      return cb(new Error('Seules les images et GIF sont autorisés'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5mo max
});

app.use('/assets/img/questions', express.static('assets/img/questions'));
app.post('/questions/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image reçue' });
    const imageUrl = `/assets/img/questions/${req.file.filename}`;
    res.status(201).json({ message: 'Image uploadée', image_url: imageUrl });
  } catch (err) {
    console.error('Erreur upload image:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// QUIZ
// ======================================================================

app.get('/quiz', async (req, res) => {
  const { class_id, matiere_id, is_active } = req.query;
  try {
    let sql = 'SELECT id, class_id, matiere_id, titre, description, type, is_active, created_by FROM quiz';
    const params = [];
    const conditions = [];
    if (class_id) { conditions.push('class_id=?'); params.push(class_id); }
    if (matiere_id) { conditions.push('matiere_id=?'); params.push(matiere_id); }
    if (is_active !== undefined) { conditions.push('is_active=?'); params.push(is_active); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur récupération quiz:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/quiz', async (req, res) => {
  const { class_id, matiere_id, titre, description, type='qcm', created_by } = req.body;
  if (!class_id || !titre) return res.status(400).json({ error: 'class_id et titre requis' });

  try {
    const [result] = await pool.query(
      'INSERT INTO quiz (class_id, matiere_id, titre, description, type, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [class_id, matiere_id || null, titre.trim(), description || null, type, created_by || null]
      );
    res.status(201).json({ message: 'Quiz créé', id: result.insertId });
  } catch (err) {
    console.error('Erreur création quiz:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un quiz
app.put('/quiz/:id', async (req, res) => {
  const { id } = req.params;
  const { titre, description, type, is_active } = req.body;

  if (!titre) return res.status(400).json({ error: 'Titre requis' });

  try {
    const [result] = await pool.query(
      'UPDATE quiz SET titre=?, description=?, type=?, is_active=? WHERE id=?',
      [titre.trim(), description || null, type || 'qcm', is_active != null ? is_active : 1, id]
      );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Quiz introuvable' });
    res.json({ message: 'Quiz modifié' });
  } catch (err) {
    console.error('Erreur modification quiz:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un quiz
app.delete('/quiz/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM quiz WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Quiz introuvable' });
    res.json({ message: 'Quiz supprimé' });
  } catch (err) {
    console.error('Erreur suppression quiz:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === SOUMISSION QUIZ ===
app.post('/api/submit', async (req, res) => {
  const { quiz_id, identifiant, answers, time_taken = 0 } = req.body;
  if (!identifiant || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'identifiant et réponses requises' });
  }

  let score = 0; 

  try {
    // Récupérer user_id
    const [users] = await pool.query('SELECT id FROM users WHERE identifiant = ?', [identifiant]);
    if (users.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const user_id = users[0].id;
    
    const [quizCheck] = await pool.query('SELECT is_active FROM quiz WHERE id = ?', [quiz_id]);
    if (quizCheck.length === 0 || !quizCheck[0].is_active) {
      return res.status(403).json({ error: 'Quiz non disponible' });
    }

    for (const a of answers) {
      if (a.choice_index !== undefined) {
        // QCM / vrai_ou_faux
        const [r] = await pool.query(
          'SELECT est_correct FROM reponses WHERE question_id = ? AND choice_index = ?',
          [a.question_id, a.choice_index]
          );
        if (r.length && r[0].est_correct === 1) score++;
      }
      else if (a.text_answer !== undefined) {
        // TEXTE LIBRE
        const [q] = await pool.query(
          'SELECT bonne_reponse FROM questions WHERE id = ?',
          [a.question_id]
          );
        if (q.length && q[0].bonne_reponse) {
          const correct = q[0].bonne_reponse.trim().toLowerCase();
          const answer = a.text_answer.trim().toLowerCase();
          if (correct === answer) score++;
        }
      }
      else if (a.puzzle_order && Array.isArray(a.puzzle_order)) {
        const [correct] = await pool.query(
          'SELECT choice_index FROM reponses WHERE question_id = ? ORDER BY ordre_correct',
          [a.question_id]
          );
        const expectedOrder = correct.map(r => r.choice_index);
        if (JSON.stringify(a.puzzle_order) === JSON.stringify(expectedOrder)) {
          score++;
        }
      }
    }
    await pool.query(
      'INSERT INTO scores (quiz_id, user_id, score, max_score, time_taken) VALUES (?, ?, ?, ?, ?)',
      [quiz_id, user_id, score, answers.length, time_taken]
      );

    res.json({
      score,
      max_score: answers.length,
      pourcentage: Math.round((score / answers.length) * 100),
      time_taken
    });

  } catch (err) {
    console.error('Erreur soumission quiz:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// Scores des utilisateurs 
// ======================================================================
app.get('/admin/results', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id,
        u.nom AS nom_utilisateur,
        u.identifiant,
        c.nom AS classe,
        q.titre AS quiz,
        s.score,
        s.max_score,
        s.time_taken,
        s.date_played
      FROM scores s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN quiz q ON s.quiz_id = q.id
      ORDER BY s.date_played DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erreur récupération des scores:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des scores' });
  }
});

// === CLASSEMENT PAR CLASSE ===
app.get('/admin/results', async (req, res) => {
  const { class_id } = req.query;
  if (!class_id) return res.status(400).json({ error: 'class_id requis' });

  try {
    const sql = `
      SELECT 
        s.score, s.max_score, s.time_taken, s.date_played, 
        u.nom AS nom_utilisateur, u.identifiant
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE u.class_id = ?
      ORDER BY s.score DESC, s.time_taken ASC  -- Score, puis + rapide
    `;
    const [rows] = await pool.query(sql, [class_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ======================================================================
// SERVER START
// ======================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(` Serveur lancé sur le port ${PORT}`);
  try {
    const conn = await pool.getConnection();
    console.log(' Connexion DB réussie');
    conn.release();
  } catch (err) {
    console.error(' Erreur connexion DB:', err);
  }
});
