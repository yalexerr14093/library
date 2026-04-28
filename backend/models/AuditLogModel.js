const { pool } = require("../db");

const AuditLogModel = {
  async write({ userId = null, action, entity, entityId = null, meta = null }) {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entity, entityId, meta]
    );
  },
};

module.exports = AuditLogModel;

