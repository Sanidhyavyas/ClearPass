const db = require("../db");

// ─── helpers ────────────────────────────────────────────────────────────────
const pagination = (q) => {
  const page  = Math.max(1, parseInt(q.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

// ─── POST /api/admin/subjects ────────────────────────────────────────────────
const createSubject = async (req, res, next) => {
  try {
    const { subjectCode, name, credits, department, description, isElective } = req.body;

    if (!subjectCode || !name) {
      return res.status(400).json({ message: "Subject code and name are required" });
    }

    const code = subjectCode.trim().toUpperCase();
    const creds = parseInt(credits) || 3;

    if (creds < 1 || creds > 6) {
      return res.status(400).json({ message: "Credits must be between 1 and 6" });
    }

    const [existing] = await db.query(
      "SELECT id FROM subjects WHERE subject_code = ? LIMIT 1",
      [code]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "A subject with this code already exists" });
    }

    const [result] = await db.query(
      `INSERT INTO subjects (subject_code, name, credits, department, description, is_elective, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name.trim(),
        creds,
        department?.trim() || null,
        description?.trim() || null,
        isElective ? 1 : 0,
        req.user?.id || null,
      ]
    );

    const [rows] = await db.query("SELECT * FROM subjects WHERE id = ?", [result.insertId]);
    return res.status(201).json({ message: "Subject created successfully", subject: rows[0] });
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/admin/subjects ─────────────────────────────────────────────────
const listSubjects = async (req, res, next) => {
  try {
    const { search, department, active } = req.query;
    const { page, limit, offset } = pagination(req.query);

    const conds  = [];
    const params = [];

    if (search) {
      conds.push("(s.subject_code LIKE ? OR s.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (department) {
      conds.push("s.department = ?");
      params.push(department);
    }
    if (active !== undefined && active !== "") {
      conds.push("s.is_active = ?");
      params.push(active === "true" || active === "1" ? 1 : 0);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const [subjects] = await db.query(
      `SELECT s.*,
              GROUP_CONCAT(
                DISTINCT CONCAT('Y', sm.year, 'S', sm.semester)
                ORDER BY sm.year, sm.semester SEPARATOR ','
              ) AS mappings_raw
       FROM subjects s
       LEFT JOIN subject_mappings sm ON s.id = sm.subject_id AND sm.is_active = 1
       ${where}
       GROUP BY s.id
       ORDER BY s.subject_code ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM subjects s ${where}`,
      params
    );

    return res.json({
      subjects: subjects.map((s) => ({
        ...s,
        mappings: s.mappings_raw ? s.mappings_raw.split(",") : [],
        mappings_raw: undefined,
      })),
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
};

// ─── PUT /api/admin/subjects/:id ─────────────────────────────────────────────
const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subjectCode, name, credits, department, description, isElective, isActive } = req.body;

    const [rows] = await db.query("SELECT * FROM subjects WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }
    const cur = rows[0];

    const code  = subjectCode ? subjectCode.trim().toUpperCase() : cur.subject_code;
    const creds = credits !== undefined ? parseInt(credits) : cur.credits;

    if (creds < 1 || creds > 6) {
      return res.status(400).json({ message: "Credits must be between 1 and 6" });
    }

    if (code !== cur.subject_code) {
      const [dup] = await db.query(
        "SELECT id FROM subjects WHERE subject_code = ? AND id != ? LIMIT 1",
        [code, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: "That subject code is already taken" });
      }
    }

    await db.query(
      `UPDATE subjects
       SET subject_code = ?, name = ?, credits = ?, department = ?,
           description = ?, is_elective = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        code,
        name?.trim() || cur.name,
        creds,
        department?.trim() || null,
        description?.trim() || null,
        isElective !== undefined ? (isElective ? 1 : 0) : cur.is_elective,
        isActive   !== undefined ? (isActive   ? 1 : 0) : cur.is_active,
        id,
      ]
    );

    const [updated] = await db.query("SELECT * FROM subjects WHERE id = ?", [id]);
    return res.json({ message: "Subject updated", subject: updated[0] });
  } catch (err) {
    return next(err);
  }
};

// ─── DELETE /api/admin/subjects/:id  (soft delete) ───────────────────────────
const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT id FROM subjects WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }
    await db.query(
      "UPDATE subjects SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    return res.json({ message: "Subject deactivated" });
  } catch (err) {
    return next(err);
  }
};

// ─── POST /api/admin/subjects/map ────────────────────────────────────────────
const mapSubject = async (req, res, next) => {
  try {
    const { subjectId, year, semester } = req.body;

    if (!subjectId || year == null || semester == null) {
      return res.status(400).json({ message: "subjectId, year, and semester are required" });
    }

    const y = parseInt(year);
    const s = parseInt(semester);

    if (y < 1 || y > 4)   return res.status(400).json({ message: "Year must be 1–4" });
    if (s < 1 || s > 2)   return res.status(400).json({ message: "Semester must be 1 or 2" });

    const [exists] = await db.query(
      "SELECT id FROM subjects WHERE id = ? AND is_active = 1 LIMIT 1",
      [subjectId]
    );
    if (exists.length === 0) {
      return res.status(404).json({ message: "Subject not found or inactive" });
    }

    const [[{ maxOrder }]] = await db.query(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM subject_mappings WHERE year = ? AND semester = ? AND is_active = 1",
      [y, s]
    );

    await db.query(
      `INSERT INTO subject_mappings (subject_id, year, semester, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_active = 1, sort_order = VALUES(sort_order)`,
      [subjectId, y, s, maxOrder + 1]
    );

    return res.status(201).json({ message: "Subject mapped to slot" });
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/admin/subjects/map/:year/:sem ──────────────────────────────────
const getSubjectsForSlot = async (req, res, next) => {
  try {
    const { year, sem } = req.params;
    const [rows] = await db.query(
      `SELECT s.id, s.subject_code, s.name, s.credits, s.department, s.is_elective,
              sm.id AS mapping_id, sm.sort_order
       FROM subjects s
       JOIN subject_mappings sm ON s.id = sm.subject_id
       WHERE sm.year = ? AND sm.semester = ? AND sm.is_active = 1 AND s.is_active = 1
       ORDER BY sm.sort_order ASC`,
      [year, sem]
    );
    return res.json({ subjects: rows });
  } catch (err) {
    return next(err);
  }
};

// ─── DELETE /api/admin/subjects/map/:id ──────────────────────────────────────
const removeMapping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT id FROM subject_mappings WHERE id = ? LIMIT 1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Mapping not found" });
    }
    await db.query("DELETE FROM subject_mappings WHERE id = ?", [id]);
    return res.json({ message: "Mapping removed" });
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/admin/subjects/structure ───────────────────────────────────────
const getAcademicStructure = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT sm.year, sm.semester, sm.sort_order, sm.id AS mapping_id,
              s.id, s.subject_code, s.name, s.credits, s.department, s.is_elective
       FROM subject_mappings sm
       JOIN subjects s ON sm.subject_id = s.id
       WHERE sm.is_active = 1 AND s.is_active = 1
       ORDER BY sm.year ASC, sm.semester ASC, sm.sort_order ASC`
    );

    // Build { year: { semester: [subjects] } }
    const structure = {};
    for (let y = 1; y <= 4; y++) {
      structure[y] = { 1: [], 2: [] };
    }
    for (const row of rows) {
      if (structure[row.year]?.[row.semester]) {
        structure[row.year][row.semester].push(row);
      }
    }

    return res.json({ structure });
  } catch (err) {
    return next(err);
  }
};

// ─── POST /api/admin/subjects/reorder ────────────────────────────────────────
const reorderSlot = async (req, res, next) => {
  try {
    const { year, semester, orderedMappingIds } = req.body;

    if (!Array.isArray(orderedMappingIds)) {
      return res.status(400).json({ message: "orderedMappingIds must be an array" });
    }

    await Promise.all(
      orderedMappingIds.map((mappingId, index) =>
        db.query(
          "UPDATE subject_mappings SET sort_order = ? WHERE id = ? AND year = ? AND semester = ?",
          [index, mappingId, year, semester]
        )
      )
    );

    return res.json({ message: "Order saved" });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createSubject,
  listSubjects,
  updateSubject,
  deleteSubject,
  mapSubject,
  getSubjectsForSlot,
  removeMapping,
  getAcademicStructure,
  reorderSlot,
};
