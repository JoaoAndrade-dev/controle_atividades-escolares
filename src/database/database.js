// src/database/database.js
// Compatible with expo-sqlite ~14.x (Expo SDK 51)
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('schoolworks.db');

// ─── INIT ────────────────────────────────────────────────────────────────────

export const initDatabase = async () => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      total_hours REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_students (
      work_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      PRIMARY KEY (work_id, student_id),
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      estimated_hours REAL NOT NULL DEFAULT 0,
      worked_hours REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
  `);
};

// ─── STUDENTS ────────────────────────────────────────────────────────────────

export const getAllStudents = async () => {
  return await db.getAllAsync('SELECT * FROM students ORDER BY name ASC');
};

export const addStudent = async (name, email, phone) => {
  const result = await db.runAsync(
    'INSERT INTO students (name, email, phone) VALUES (?, ?, ?)',
    [name, email || '', phone || '']
  );
  return result.lastInsertRowId;
};

export const updateStudent = async (id, name, email, phone) => {
  return await db.runAsync(
    'UPDATE students SET name = ?, email = ?, phone = ? WHERE id = ?',
    [name, email || '', phone || '', id]
  );
};

export const deleteStudent = async (id) => {
  return await db.runAsync('DELETE FROM students WHERE id = ?', [id]);
};

// ─── WORKS ───────────────────────────────────────────────────────────────────

export const getAllWorks = async () => {
  return await db.getAllAsync(`
    SELECT w.*,
      (SELECT COUNT(*) FROM activities a WHERE a.work_id = w.id) as activity_count,
      (SELECT COUNT(*) FROM activities a WHERE a.work_id = w.id AND a.status = 'completed') as completed_count,
      (SELECT COALESCE(SUM(a.worked_hours), 0) FROM activities a WHERE a.work_id = w.id) as worked_hours
    FROM works w ORDER BY w.created_at DESC
  `);
};

export const getWorkById = async (id) => {
  return await db.getFirstAsync(`
    SELECT w.*,
      (SELECT COALESCE(SUM(a.worked_hours), 0) FROM activities a WHERE a.work_id = w.id) as worked_hours
    FROM works w WHERE w.id = ?
  `, [id]);
};

export const addWork = async (name, deliveryDate, totalHours, status, description) => {
  const result = await db.runAsync(
    'INSERT INTO works (name, delivery_date, total_hours, status, description) VALUES (?, ?, ?, ?, ?)',
    [name, deliveryDate, totalHours, status || 'pending', description || '']
  );
  return result.lastInsertRowId;
};

export const updateWork = async (id, name, deliveryDate, totalHours, status, description) => {
  return await db.runAsync(
    'UPDATE works SET name = ?, delivery_date = ?, total_hours = ?, status = ?, description = ? WHERE id = ?',
    [name, deliveryDate, totalHours, status, description || '', id]
  );
};

export const deleteWork = async (id) => {
  return await db.runAsync('DELETE FROM works WHERE id = ?', [id]);
};

// ─── WORK-STUDENTS ───────────────────────────────────────────────────────────

export const getWorkStudents = async (workId) => {
  return await db.getAllAsync(
    `SELECT s.* FROM students s
     INNER JOIN work_students ws ON ws.student_id = s.id
     WHERE ws.work_id = ?
     ORDER BY s.name ASC`,
    [workId]
  );
};

export const setWorkStudents = async (workId, studentIds) => {
  await db.runAsync('DELETE FROM work_students WHERE work_id = ?', [workId]);
  for (const sid of studentIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO work_students (work_id, student_id) VALUES (?, ?)',
      [workId, sid]
    );
  }
};

// ─── ACTIVITIES ──────────────────────────────────────────────────────────────

export const getWorkActivities = async (workId) => {
  return await db.getAllAsync(
    `SELECT a.*, s.name as student_name
     FROM activities a
     INNER JOIN students s ON s.id = a.student_id
     WHERE a.work_id = ?
     ORDER BY a.created_at ASC`,
    [workId]
  );
};

export const addActivity = async (workId, description, studentId, status, estimatedHours) => {
  const result = await db.runAsync(
    'INSERT INTO activities (work_id, description, student_id, status, estimated_hours, worked_hours) VALUES (?, ?, ?, ?, ?, 0)',
    [workId, description, studentId, status || 'pending', estimatedHours || 0]
  );
  return result.lastInsertRowId;
};

export const updateActivity = async (id, description, studentId, status, estimatedHours) => {
  return await db.runAsync(
    'UPDATE activities SET description = ?, student_id = ?, status = ?, estimated_hours = ? WHERE id = ?',
    [description, studentId, status, estimatedHours, id]
  );
};

export const updateActivityProgress = async (id, workedHours, status) => {
  return await db.runAsync(
    'UPDATE activities SET worked_hours = ?, status = ? WHERE id = ?',
    [workedHours, status, id]
  );
};

export const deleteActivity = async (id) => {
  return await db.runAsync('DELETE FROM activities WHERE id = ?', [id]);
};
