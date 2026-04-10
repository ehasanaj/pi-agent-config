import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, readlink, rmdir, unlink, writeFile, chmod } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const CHECKPOINT_TYPE = "reverse-checkpoint";
const EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const AUTHOR_NAME = "pi reverse";
const AUTHOR_EMAIL = "pi-reverse@local";

type CheckpointData = {
  entryId: string;
  commit: string;
  ref: string;
  preview: string;
  createdAt: string;
  repoRoot: string;
  scopeRel: string;
};

type SnapshotEntry = {
  path: string;
  mode: string;
  hash: string;
};

type GitRunOptions = {
  cwd: string;
  input?: string | Buffer;
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
};

export default function (pi: ExtensionAPI) {
  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "user") return;

    let repoInfo: { repoRoot: string; scopeRel: string };
    try {
      repoInfo = await getRepoInfo(ctx.cwd);
    } catch {
      return;
    }

    const leaf = ctx.sessionManager.getLeafEntry();
    if (!leaf || leaf.type !== "message" || leaf.message.role !== "user") return;

    try {
      const commit = await createSnapshotCommit(repoInfo.repoRoot, repoInfo.scopeRel, ctx.signal);
      const ref = checkpointRef(ctx.sessionManager.getSessionId(), leaf.id);
      await gitText(repoInfo.repoRoot, ["update-ref", ref, commit], { cwd: repoInfo.repoRoot, signal: ctx.signal });

      const data: CheckpointData = {
        entryId: leaf.id,
        commit,
        ref,
        preview: previewUserMessage(event.message.content),
        createdAt: new Date(event.message.timestamp).toISOString(),
        repoRoot: repoInfo.repoRoot,
        scopeRel: repoInfo.scopeRel,
      };

      pi.appendEntry(CHECKPOINT_TYPE, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`reverse checkpoint failed: ${message}`, "warning");
    }
  });

  pi.registerCommand("reverse", {
    description: "Restore files and session to a previous user message checkpoint",
    handler: async (_args, ctx) => {
      await ctx.waitForIdle();

      let repoInfo: { repoRoot: string; scopeRel: string };
      try {
        repoInfo = await getRepoInfo(ctx.cwd);
      } catch {
        ctx.ui.notify("/reverse works only inside a git repository", "warning");
        return;
      }

      const checkpoints = getBranchCheckpoints(ctx.sessionManager)
        .filter((checkpoint) => checkpoint.repoRoot === repoInfo.repoRoot && checkpoint.scopeRel === repoInfo.scopeRel)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (checkpoints.length === 0) {
        ctx.ui.notify("No reverse checkpoints found on the current branch", "warning");
        return;
      }

      const options = checkpoints.map((checkpoint) => formatCheckpointOption(checkpoint));
      const choice = await ctx.ui.select("Reverse to which message?", options);
      if (!choice) return;

      const checkpoint = checkpoints.find((item) => formatCheckpointOption(item) === choice);
      if (!checkpoint) {
        ctx.ui.notify("Selected checkpoint not found", "error");
        return;
      }

      await restoreSnapshot(repoInfo.repoRoot, ctx.cwd, repoInfo.scopeRel, checkpoint.ref);
      const result = (await ctx.navigateTree(checkpoint.entryId, { summarize: false })) as
        | { cancelled: boolean; editorText?: string }
        | undefined;

      if (result?.cancelled) {
        ctx.ui.notify("Session reverse cancelled", "warning");
        return;
      }

      if (result?.editorText) {
        ctx.ui.setEditorText(result.editorText);
      }

      ctx.ui.notify("Reversed files and conversation", "info");
    },
  });
}

async function getRepoInfo(cwd: string): Promise<{ repoRoot: string; scopeRel: string }> {
  const repoRoot = await gitText(cwd, ["rev-parse", "--show-toplevel"], { cwd });
  const scopeRelRaw = relative(repoRoot, resolve(cwd));
  const scopeRel = normalizeGitPath(scopeRelRaw === "" ? "" : scopeRelRaw);
  return { repoRoot, scopeRel };
}

function checkpointRef(sessionId: string, entryId: string): string {
  return `refs/pi-checkpoints/${sessionId}/${entryId}`;
}

function getBranchCheckpoints(sessionManager: {
  getBranch(): Array<{ type: string; customType?: string; data?: unknown }>;
}): CheckpointData[] {
  const checkpoints: CheckpointData[] = [];

  for (const entry of sessionManager.getBranch()) {
    if (entry.type !== "custom" || entry.customType !== CHECKPOINT_TYPE || !entry.data) continue;
    const data = entry.data as Partial<CheckpointData>;
    if (
      typeof data.entryId !== "string" ||
      typeof data.commit !== "string" ||
      typeof data.ref !== "string" ||
      typeof data.preview !== "string" ||
      typeof data.createdAt !== "string" ||
      typeof data.repoRoot !== "string" ||
      typeof data.scopeRel !== "string"
    ) {
      continue;
    }
    checkpoints.push(data as CheckpointData);
  }

  return checkpoints;
}

function previewUserMessage(content: string | Array<{ type: string; text?: string }>): string {
  const text =
    typeof content === "string"
      ? content
      : content
          .filter((block) => block.type === "text" && typeof block.text === "string")
          .map((block) => block.text)
          .join(" ");

  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "(empty message)";
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

function formatCheckpointOption(checkpoint: CheckpointData): string {
  return `${formatTimestamp(checkpoint.createdAt)} · ${checkpoint.preview} · ${checkpoint.entryId}`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function normalizeGitPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function toSnapshotPath(repoRelativePath: string, scopeRel: string): string {
  if (!scopeRel) return normalizeGitPath(repoRelativePath);
  return normalizeGitPath(relative(scopeRel, repoRelativePath));
}

async function createSnapshotCommit(repoRoot: string, scopeRel: string, signal?: AbortSignal): Promise<string> {
  const repoPaths = await listScopeFiles(repoRoot, scopeRel, signal);
  const treeEntries: SnapshotEntry[] = [];

  for (const repoPath of repoPaths) {
    const absolutePath = join(repoRoot, repoPath);
    const stats = await lstat(absolutePath);
    const snapshotPath = toSnapshotPath(repoPath, scopeRel);

    if (stats.isSymbolicLink()) {
      const target = await readlink(absolutePath);
      const hash = await gitText(repoRoot, ["hash-object", "-w", "--stdin"], {
        cwd: repoRoot,
        input: target,
        signal,
      });
      treeEntries.push({ path: snapshotPath, mode: "120000", hash });
      continue;
    }

    if (!stats.isFile()) continue;

    const content = await readFile(absolutePath);
    const hash = await gitText(repoRoot, ["hash-object", "-w", "--stdin"], {
      cwd: repoRoot,
      input: content,
      signal,
    });
    treeEntries.push({
      path: snapshotPath,
      mode: stats.mode & 0o111 ? "100755" : "100644",
      hash,
    });
  }

  const treeHash = await buildTree(repoRoot, treeEntries, signal);
  const commit = await gitText(repoRoot, ["commit-tree", treeHash], {
    cwd: repoRoot,
    input: `pi reverse checkpoint\n`,
    signal,
    env: gitAuthorEnv(),
  });
  return commit;
}

async function buildTree(repoRoot: string, entries: SnapshotEntry[], signal?: AbortSignal): Promise<string> {
  if (entries.length === 0) return EMPTY_TREE_HASH;

  const files = new Map<string, SnapshotEntry>();
  const directories = new Map<string, SnapshotEntry[]>();

  for (const entry of entries) {
    const parts = entry.path.split("/");
    const [head, ...rest] = parts;
    if (!head) continue;

    if (rest.length === 0) {
      files.set(head, entry);
    } else {
      const existing = directories.get(head) ?? [];
      existing.push({ ...entry, path: rest.join("/") });
      directories.set(head, existing);
    }
  }

  const records: Buffer[] = [];
  const names = [...new Set([...files.keys(), ...directories.keys()])].sort((a, b) => a.localeCompare(b));

  for (const name of names) {
    if (files.has(name)) {
      const file = files.get(name)!;
      records.push(Buffer.from(`${file.mode} blob ${file.hash}\t${name}`, "utf8"));
      records.push(Buffer.from([0]));
      continue;
    }

    const children = directories.get(name)!;
    const childTree = await buildTree(repoRoot, children, signal);
    records.push(Buffer.from(`040000 tree ${childTree}\t${name}`, "utf8"));
    records.push(Buffer.from([0]));
  }

  const treeHash = await gitText(repoRoot, ["mktree", "-z"], {
    cwd: repoRoot,
    input: Buffer.concat(records),
    signal,
  });

  return treeHash;
}

async function restoreSnapshot(repoRoot: string, cwd: string, scopeRel: string, revision: string): Promise<void> {
  const snapshotEntries = await listSnapshotEntries(repoRoot, revision);
  const snapshotSet = new Set(snapshotEntries.map((entry) => entry.path));
  const currentRepoPaths = await listScopeFiles(repoRoot, scopeRel);
  const currentSnapshotPaths = currentRepoPaths.map((repoPath) => toSnapshotPath(repoPath, scopeRel));

  for (const path of currentSnapshotPaths) {
    if (snapshotSet.has(path)) continue;
    const absolutePath = resolve(cwd, path);
    await deletePathIfPresent(absolutePath);
  }

  for (const entry of snapshotEntries.sort((a, b) => a.path.localeCompare(b.path))) {
    const absolutePath = resolve(cwd, entry.path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await restoreSnapshotEntry(repoRoot, entry, absolutePath);
  }
}

async function listScopeFiles(repoRoot: string, scopeRel: string, signal?: AbortSignal): Promise<string[]> {
  const args = ["ls-files", "-z", "--cached", "--others", "--exclude-standard"];
  if (scopeRel) {
    args.push("--", scopeRel);
  } else {
    args.push("--", ".");
  }

  const output = await gitBuffer(repoRoot, args, { cwd: repoRoot, signal });
  const candidates = splitNull(output.toString("utf8"));
  const existing = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeGitPath(candidate);
    if (!normalized) continue;
    try {
      const stats = await lstat(join(repoRoot, normalized));
      if (stats.isFile() || stats.isSymbolicLink()) {
        existing.add(normalized);
      }
    } catch {
      // File no longer exists in the working tree; skip it.
    }
  }

  return [...existing].sort((a, b) => a.localeCompare(b));
}

async function listSnapshotEntries(repoRoot: string, revision: string): Promise<SnapshotEntry[]> {
  const output = await gitBuffer(repoRoot, ["ls-tree", "-r", "-z", revision], { cwd: repoRoot });
  const records = splitNull(output.toString("utf8"));
  const entries: SnapshotEntry[] = [];

  for (const record of records) {
    const tabIndex = record.indexOf("\t");
    if (tabIndex === -1) continue;

    const meta = record.slice(0, tabIndex);
    const path = record.slice(tabIndex + 1);
    const [mode, type, hash] = meta.split(" ");
    if (!path || type !== "blob" || !mode || !hash) continue;
    entries.push({ path, mode, hash });
  }

  return entries;
}

async function restoreSnapshotEntry(repoRoot: string, entry: SnapshotEntry, absolutePath: string): Promise<void> {
  const content = await gitBuffer(repoRoot, ["cat-file", "-p", entry.hash], { cwd: repoRoot });

  if (entry.mode === "120000") {
    await removeConflictingPath(absolutePath, "symlink");
    await symlinkSafe(content.toString("utf8"), absolutePath);
    return;
  }

  await removeConflictingPath(absolutePath, "file");
  await writeFile(absolutePath, content);
  await chmod(absolutePath, entry.mode === "100755" ? 0o755 : 0o644);
}

async function deletePathIfPresent(path: string): Promise<void> {
  try {
    const stats = await lstat(path);
    if (stats.isDirectory()) {
      await rmdir(path);
      return;
    }
    await unlink(path);
  } catch {
    // Already gone or not removable as a direct file/symlink.
  }
}

async function removeConflictingPath(path: string, targetType: "file" | "symlink"): Promise<void> {
  try {
    const stats = await lstat(path);
    if (stats.isDirectory()) {
      await rmdir(path);
      return;
    }
    await unlink(path);
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw new Error(`Could not prepare ${targetType} path ${path}: ${String(error)}`);
    }
  }
}

async function symlinkSafe(target: string, path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Ignore missing file.
  }
  const { symlink } = await import("node:fs/promises");
  await symlink(target, path);
}

function splitNull(text: string): string[] {
  return text.split("\u0000").filter(Boolean);
}

function gitAuthorEnv(): Record<string, string> {
  return {
    GIT_AUTHOR_NAME: AUTHOR_NAME,
    GIT_AUTHOR_EMAIL: AUTHOR_EMAIL,
    GIT_COMMITTER_NAME: AUTHOR_NAME,
    GIT_COMMITTER_EMAIL: AUTHOR_EMAIL,
  };
}

async function gitText(repoRoot: string, args: string[], options: GitRunOptions): Promise<string> {
  const output = await gitBuffer(repoRoot, args, options);
  return output.toString("utf8").trim();
}

async function gitBuffer(repoRoot: string, args: string[], options: GitRunOptions): Promise<Buffer> {
  const { stdout } = await runProcess("git", args, {
    cwd: options.cwd || repoRoot,
    input: options.input,
    signal: options.signal,
    env: options.env,
  });
  return stdout;
}

async function runProcess(
  command: string,
  args: string[],
  options: GitRunOptions,
): Promise<{ stdout: Buffer; stderr: Buffer }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
      signal: options.signal,
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => rejectPromise(error));
    child.on("close", (code) => {
      const out = Buffer.concat(stdout);
      const err = Buffer.concat(stderr);
      if (code === 0) {
        resolvePromise({ stdout: out, stderr: err });
        return;
      }
      const errorText = err.toString("utf8").trim() || out.toString("utf8").trim() || `exit code ${code}`;
      rejectPromise(new Error(`${command} ${args.join(" ")} failed: ${errorText}`));
    });

    if (options.input !== undefined) {
      child.stdin.end(options.input);
    } else {
      child.stdin.end();
    }
  });
}

function isMissingPathError(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT";
}
