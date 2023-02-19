import fs from "fs";
import path from "node:path";

export function getFilePath(id: string, baseDir: string) {
  id = path.normalize(id);
  let paths = [id, path.join(baseDir, id)];
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  throw "existsSync " + id
}

export function toPosixPath(v: any) {
  return String(v).split(path.sep).join(path.posix.sep)
}