const { test } = require("node:test");
const assert = require("node:assert");

const { upload, UPLOAD_LIMITS } = require("../middleware/upload");

test("upload middleware exposes multer helpers", () => {
  assert.equal(typeof upload.single, "function");
  assert.equal(typeof upload.array, "function");
  assert.equal(typeof upload.fields, "function");
});

test("UPLOAD_LIMITS matches documented constraints", () => {
  assert.equal(UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024);
  assert.equal(UPLOAD_LIMITS.MAX_FILES_PER_REQUEST, 5);
});