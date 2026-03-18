const express = require('express');
const router = express.Router();
const wa = require('../whatsapp');

router.post('/deploy', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!process.env.NOTIFY_TOKEN || token !== process.env.NOTIFY_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { commit, branch, actor } = req.body;
  const lines = ['🚀 *Cafofo Bring* — deploy concluído!'];
  if (actor) lines.push(`👤 ${actor}`);
  if (branch) lines.push(`🌿 ${branch}`);
  if (commit) lines.push(`📝 ${commit}`);

  wa.sendMessage(lines.join('\n')).catch(console.error);
  res.json({ ok: true });
});

module.exports = router;
