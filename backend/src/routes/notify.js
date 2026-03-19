const express = require('express');
const router = express.Router();
const wa = require('../whatsapp');

router.post('/deploy', (req, res) => {
  const { commit, branch, actor, status, service } = req.body;
  const lines = [`🚀 *${service || 'Cafofo Bring'}* — ${status || 'deploy concluído!'}`];
  if (actor) lines.push(`👤 ${actor}`);
  if (branch) lines.push(`🌿 ${branch}`);
  if (commit) lines.push(`📝 ${commit}`);

  wa.sendNotifyMessage(lines.join('\n')).catch(console.error);
  res.json({ ok: true });
});

module.exports = router;
