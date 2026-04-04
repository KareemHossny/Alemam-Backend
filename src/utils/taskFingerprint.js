const crypto = require("crypto");

const normalizeTaskText = (value) => String(value ?? "").trim().toLowerCase();

const normalizeTaskDateKey = (value) => {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return String(value).trim();
};

const buildTaskFingerprint = ({ project, projectId, createdBy, title, note, date }) => {
  const fingerprintSource = JSON.stringify({
    projectId: String(projectId || project || ""),
    createdBy: String(createdBy || ""),
    title: normalizeTaskText(title),
    note: normalizeTaskText(note),
    date: normalizeTaskDateKey(date),
  });

  return crypto.createHash("sha256").update(fingerprintSource).digest("hex");
};

module.exports = {
  buildTaskFingerprint,
  normalizeTaskDateKey,
  normalizeTaskText,
};
