const childProcess = require("node:child_process");
const { EventEmitter } = require("node:events");

const originalExec = childProcess.exec;

function normalizeExecArgs(command, options, callback) {
  if (typeof options === "function") return { command, options: undefined, callback: options };
  return { command, options, callback };
}

childProcess.exec = function patchedExec(command, options, callback) {
  const normalized = normalizeExecArgs(command, options, callback);
  const cmd = (normalized.command || "").trim().toLowerCase();

  // Vite on Windows runs `net use` during startup to detect network drive mappings.
  // In some environments this is blocked and crashes with `spawn EPERM`.
  // This patch makes that call a no-op (Vite will fallback to safe defaults).
  if (cmd === "net use") {
    const proc = new EventEmitter();
    proc.kill = () => true;
    proc.pid = -1;
    proc.stdout = null;
    proc.stderr = null;

    process.nextTick(() => {
      if (typeof normalized.callback === "function") {
        const err = new Error("Disabled `net use` (spawn blocked)");
        normalized.callback(err, "", "");
      }
      proc.emit("close", 1);
      proc.emit("exit", 1);
    });

    return proc;
  }

  return originalExec.call(this, normalized.command, normalized.options, normalized.callback);
};

