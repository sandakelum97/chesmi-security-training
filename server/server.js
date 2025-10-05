// ===================================================================================
// === FINAL & DEPLOYMENT-READY CODE FOR server.js (Includes SSL Config)
// ===================================================================================

require('dotenv').config();
const express = require('express');
const path = require('path'); // Handles file paths
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- SERVE STATIC FILES (for Vercel, this is handled by vercel.json, but it's safe to keep) ---
app.use(express.static(path.join(__dirname, '../client')));

// Database Pool Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // --- CRITICAL: SSL configuration for production database connection ---
  ssl: {
    rejectUnauthorized: false
  }
});

// AUTHENTICATION MIDDLEWARE
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.sendStatus(403);
        try {
            const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
            if (result.rows.length === 0) return res.sendStatus(404);
            req.user = result.rows[0];
            next();
        } catch (dbError) {
            res.sendStatus(500);
        }
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admins only.' });
    }
};

// === API ENDPOINTS ===

// Auth (Public)
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const result = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, passwordHash]);
        res.status(201).json({ message: 'User registered successfully!', user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Email already exists.' });
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });
        const payload = { userId: user.id, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful!', token: token, user: { name: user.name, role: user.role } });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Leaderboard (Public)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const query = `
            SELECT u.name, COUNT(qa.id) AS quizzes_passed, ROUND(AVG(qa.score)) AS average_score
            FROM users u JOIN quiz_attempts qa ON u.id = qa.user_id
            WHERE qa.status = 'pass'
            GROUP BY u.id, u.name
            ORDER BY quizzes_passed DESC, average_score DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        res.status(500).json({ error: 'Server error fetching leaderboard data.' });
    }
});

// Quiz Fetching Endpoint (Protected)
app.get('/api/quizzes/:slug', authenticateToken, async (req, res) => {
    const { slug } = req.params;
    try {
        const quizResult = await pool.query('SELECT * FROM quizzes WHERE slug = $1', [slug]);
        if (quizResult.rows.length === 0) return res.status(404).json({ error: 'Quiz not found.' });
        const quiz = quizResult.rows[0];
        const questionsResult = await pool.query('SELECT * FROM questions WHERE quiz_id = $1', [quiz.id]);
        const allQuestions = questionsResult.rows;
        const shuffle = arr => arr.sort(() => 0.5 - Math.random());
        const easy = shuffle(allQuestions.filter(q => q.difficulty === 'easy')).slice(0, 3);
        const medium = shuffle(allQuestions.filter(q => q.difficulty === 'medium')).slice(0, 4);
        const hard = shuffle(allQuestions.filter(q => q.difficulty === 'hard')).slice(0, 3);
        const selectedQuestions = shuffle([...easy, ...medium, ...hard]);
        const processedQuestions = selectedQuestions.map(q => {
            let options = q.options;
            if (typeof options === 'string') { try { options = JSON.parse(options); } catch (e) { options = []; } }
            if (Array.isArray(options) && options.includes('Phishing')) {
                return { type: 'phishing-email', emailContent: q.question_text, isPhishing: q.correct_answer === 'Phishing', explanation: q.explanation, difficulty: q.difficulty };
            } else {
                return { type: 'mcq', question: q.question_text, options: options, answer: q.correct_answer, explanation: q.explanation, difficulty: q.difficulty };
            }
        });
        res.json({ title: quiz.title, training: quiz.training_html, questions: processedQuestions });
    } catch (err) {
        console.error(`Error fetching quiz ${slug}:`, err);
        res.status(500).json({ error: 'Server error fetching quiz data.' });
    }
});

// User (Protected)
app.post('/api/quizzes/submit', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { quizTitle, score, totalQuestions, status } = req.body;
    try {
        const query = `INSERT INTO quiz_attempts (user_id, quiz_title, score, total_questions, status) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const values = [userId, quizTitle, score, totalQuestions, status];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error submitting quiz attempt:', err);
        res.status(500).json({ error: 'Server error while submitting quiz attempt.' });
    }
});

app.get('/api/profile/attempts', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const query = 'SELECT * FROM quiz_attempts WHERE user_id = $1 ORDER BY completed_at DESC';
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching profile attempts:', err);
        res.status(500).json({ error: 'Server error while fetching profile data.' });
    }
});

// Admin (Admin Only)
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching users.' });
    }
});

app.get('/api/admin/users/:id/attempts', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const query = 'SELECT * FROM quiz_attempts WHERE user_id = $1 ORDER BY completed_at DESC';
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch(err) {
        console.error('Error fetching user attempts for admin:', err);
        res.status(500).json({ error: 'Server error fetching user attempts.' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (err) {
        if (err.code === '23503') { return res.status(400).json({ error: 'Cannot delete user. Please delete their quiz attempts first.' }); }
        res.status(500).json({ error: 'Server error deleting user.' });
    }
});

app.put('/api/admin/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role specified.' });
    try {
        const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [role, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.status(200).json({ message: 'User role updated successfully.', user: result.rows[0] });
    } catch (err) {
        console.error('Error updating user role:', err);
        res.status(500).json({ error: 'Server error updating user role.' });
    }
});

// --- CATCH-ALL ROUTE ---
// This serves the index.html file for any route that isn't an API call.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Export the app for Vercel
module.exports = app;
