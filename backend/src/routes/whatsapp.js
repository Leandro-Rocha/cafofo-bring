const express = require('express');
const router = express.Router();
const wa = require('../whatsapp');

router.get('/status', (req, res) => {
  res.json(wa.getStatus());
});

router.get('/groups', async (req, res) => {
  const groups = await wa.getGroups();
  res.json(groups);
});

router.post('/group', (req, res) => {
  const { groupId, groupName } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId obrigatório' });
  wa.setGroup(groupId, groupName || groupId);
  res.json({ ok: true });
});

router.post('/interval', (req, res) => {
  const minutes = parseInt(req.body.minutes);
  if (!minutes || minutes < 1 || minutes > 120) {
    return res.status(400).json({ error: 'Intervalo inválido (1–120 minutos)' });
  }
  wa.setIntervalMinutes(minutes);
  res.json({ ok: true });
});

router.post('/groq-key', (req, res) => {
  wa.setGroqApiKey(req.body.key || null);
  res.json({ ok: true });
});

router.post('/disconnect', (req, res) => {
  wa.disconnect();
  res.json({ ok: true });
});

module.exports = router;
