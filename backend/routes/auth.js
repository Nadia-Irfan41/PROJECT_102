const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const router = express.Router();
const pool = require("../db");

// ---- signed login token (HMAC, no extra package) ----
const SECRET = process.env.JWT_SECRET || "change-this-secret-in-env";
const b64 = (x) => Buffer.from(x).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

function createToken(userId) {
  const payload = b64(JSON.stringify({ id: userId, exp: Date.now() + 7 * 24 * 3600 * 1000 }));
  return payload + "." + sign(payload);
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING user_id, name, email`,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "Registration successful",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Server error: " + error.message
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query(
      "SELECT user_id, name, email, password FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      token: createToken(user.user_id),
      user: { user_id: user.user_id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// ---- Forgot password: 1) verify email -> short-lived reset token, 2) set new password ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pwStamp = (hash) => crypto.createHash("sha256").update(hash).digest("hex").slice(0, 16);

router.post("/forgot/verify", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const r = await pool.query("SELECT user_id, password FROM users WHERE lower(email) = lower($1)", [email]);
    if (!r.rows.length) return res.status(404).json({ message: "This email is not registered." });
    const payload = b64(JSON.stringify({ id: r.rows[0].user_id, purpose: "reset", s: pwStamp(r.rows[0].password), exp: Date.now() + 10 * 60 * 1000 }));
    res.json({ resetToken: payload + "." + sign(payload) });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error. Please try again." }); }
});

router.post("/forgot/reset", async (req, res) => {
  try {
    const { resetToken, new_password, confirm_password } = req.body;
    if (!new_password || String(new_password).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
    if (new_password !== confirm_password) return res.status(400).json({ message: "Passwords do not match." });
    const [payload, sig] = String(resetToken || "").split(".");
    const ok = payload && sig && sig.length === sign(payload).length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(payload)));
    const data = ok ? JSON.parse(Buffer.from(payload, "base64url").toString()) : null;
    if (!data || data.purpose !== "reset" || data.exp < Date.now()) return res.status(400).json({ message: "Reset session expired. Please start again." });
    const u = await pool.query("SELECT password FROM users WHERE user_id = $1", [data.id]);
    if (!u.rows.length || pwStamp(u.rows[0].password) !== data.s) return res.status(400).json({ message: "Reset link already used. Please start again." });
    await pool.query("UPDATE users SET password = $2 WHERE user_id = $1", [data.id, await bcrypt.hash(new_password, 10)]);
    res.json({ message: "Password reset successful" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error. Please try again." }); }
});

module.exports = router;
