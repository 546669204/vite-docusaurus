// @ts-nocheck
"use strict";
const { toPosixPath } = require("./utils");
const path = require("node:path");
const os = require("node:os");
const node_module = require("node:module");
const fastGlob = require("fast-glob");
const path$1 = require("path");
const fs = require("fs");
const _interopDefaultLegacy = (e) => e && typeof e === "object" && "default" in e ? e : { default: e };
const path__default = /* @__PURE__ */ _interopDefaultLegacy(path);
const os__default = /* @__PURE__ */ _interopDefaultLegacy(os);
const fastGlob__default = /* @__PURE__ */ _interopDefaultLegacy(fastGlob);
const path$1__default = /* @__PURE__ */ _interopDefaultLegacy(path$1);
const fs__default = /* @__PURE__ */ _interopDefaultLegacy(fs);
const DEFAULT_EXTENSIONS = [
  ".mjs",
  ".js",
  ".mts",
  ".ts",
  ".jsx",
  ".tsx",
  ".json"
];
const KNOWN_SFC_EXTENSIONS = [
  ".vue",
  ".svelte"
];
const KNOWN_ASSET_TYPES = [
  "png",
  "jpe?g",
  "jfif",
  "pjpeg",
  "pjp",
  "gif",
  "svg",
  "ico",
  "webp",
  "avif",
  "mp4",
  "webm",
  "ogg",
  "mp3",
  "wav",
  "flac",
  "aac",
  "woff2?",
  "eot",
  "ttf",
  "otf",
  "webmanifest",
  "pdf",
  "txt"
];
const KNOWN_CSS_TYPES = [
  "css",
  "less",
  "sass",
  "scss",
  "styl",
  "stylus",
  "pcss",
  "postcss"
];
const multilineCommentsRE = /\/\*(.|[\r\n])*?\*\//gm;
const singlelineCommentsRE = /(?<!:)\/\/.*/g;
class MagicString {
  constructor(str) {
    this.str = str;
    this.starts = "";
    this.ends = "";
  }
  append(content) {
    this.ends += content;
    return this;
  }
  prepend(content) {
    this.starts = content + this.starts;
    return this;
  }
  overwrite(start, end, content) {
    if (end < start) {
      throw new Error(`"end" con't be less than "start".`);
    }
    if (!this.overwrites) {
      this.overwrites = [];
    }
    this.overwrites.push({ loc: [start, end], content });
    return this;
  }
  toString() {
    let str = this.str;
    if (this.overwrites) {
      const arr = [...this.overwrites].sort((a, b) => b.loc[0] - a.loc[0]);
      for (const { loc: [start, end], content } of arr) {
        str = str.slice(0, start) + content + str.slice(end);
      }
    }
    return this.starts + str + this.ends;
  }
}
function relativeify$1(relative) {
  if (relative === "") {
    return ".";
  }
  if (!relative.startsWith(".")) {
    return "./" + relative;
  }
  return relative;
}
async function walk(ast, visitors, ancestors = []) {
  var _a;
  if (!ast)
    return;
  if (Array.isArray(ast)) {
    for (const element of ast) {
      await walk(element, visitors, ancestors);
    }
  } else {
    ancestors = ancestors.concat(ast);
    for (const key of Object.keys(ast)) {
      await (typeof ast[key] === "object" && walk(ast[key], visitors, ancestors));
    }
  }
  await ((_a = visitors[ast.type]) === null || _a === void 0 ? void 0 : _a.call(visitors, ast, ancestors));
}
walk.sync = function walkSync(ast, visitors, ancestors = []) {
  var _a;
  if (!ast)
    return;
  if (Array.isArray(ast)) {
    for (const element of ast) {
      walkSync(element, visitors, ancestors);
    }
  } else {
    ancestors = ancestors.concat(ast);
    for (const key of Object.keys(ast)) {
      typeof ast[key] === "object" && walkSync(ast[key], visitors, ancestors);
    }
  }
  (_a = visitors[ast.type]) === null || _a === void 0 ? void 0 : _a.call(visitors, ast, ancestors);
};
const isWindows$1 = os__default.default.platform() === "win32";
function slash$1(p) {
  return p.replace(/\\/g, "/");
}
function normalizePath$1(id) {
  return path__default.default.posix.normalize(isWindows$1 ? slash$1(id) : id);
}
var TopScopeType = /* @__PURE__ */ ((TopScopeType2) => {
  TopScopeType2["ExpressionStatement"] = "ExpressionStatement";
  TopScopeType2["VariableDeclaration"] = "VariableDeclaration";
  return TopScopeType2;
})(TopScopeType || {});
function analyzer(ast, code, id) {
  const analyzed = {
    ast,
    code,
    id,
    require: [],
    exports: []
  };
  walk.sync(ast, {
    CallExpression(node, ancestors) {
      if (node.callee.name !== "require")
        return;
      const dynamic = checkDynamicId(node);
      analyzed.require.push({
        node,
        ancestors,
        topScopeNode: dynamic === "dynamic" ? void 0 : findTopLevelScope(ancestors),
        dynamic: checkDynamicId(node)
      });
    },
    AssignmentExpression(node) {
      if (node.left.type !== "MemberExpression")
        return;
      if (!(node.left.object.type === "Identifier" && ["module", "exports"].includes(node.left.object.name)))
        return;
      analyzed.exports.push({
        node,
        token: {
          left: node.left.object.name,
          right: node.left.property.name
        }
      });
    }
  });
  return analyzed;
}
function checkDynamicId(node) {
  var _a, _b, _c;
  if (((_a = node.arguments[0]) == null ? void 0 : _a.type) === "TemplateLiteral" && ((_b = node.arguments[0]) == null ? void 0 : _b.quasis.length) === 1) {
    return "Literal";
  }
  return ((_c = node.arguments[0]) == null ? void 0 : _c.type) !== "Literal" ? "dynamic" : void 0;
}
function findTopLevelScope(ancestors) {
  const ances = ancestors.map((an) => an.type).join();
  const arr = [...ancestors].reverse();
  if (/Program,ExpressionStatement,(MemberExpression,)?CallExpression$/.test(ances)) {
    return arr.find((e) => e.type === "ExpressionStatement");
  }
  return;
}
function generateImport(analyzed) {
  const imports = [];
  let count = 0;
  for (const req of analyzed.require) {
    const {
      node,
      ancestors,
      topScopeNode,
      dynamic
    } = req;
    if (dynamic === "dynamic")
      continue;
    const impt = { node, topScopeNode };
    const importName = `__CJS__import__${count++}__`;
    const requireIdNode = node.arguments[0];
    let requireId;
    if (!requireIdNode)
      continue;
    if (requireIdNode.type === "Literal") {
      requireId = requireIdNode.value;
    } else if (dynamic === "Literal") {
      requireId = requireIdNode.quasis[0].value.raw;
    }
    if (!requireId) {
      const codeSnippets = analyzed.code.slice(node.start, node.end);
      throw new Error(`The following require statement cannot be converted.
      -> ${codeSnippets}
         ${"^".repeat(codeSnippets.length)}`);
    }
    {
      impt.importee = `import * as ${importName} from '${toPosixPath(requireId)}'`;
      impt.importName = `${importName}.default || ${importName}`;
    }
    imports.push(impt);
  }
  return imports;
}
function generateExport(analyzed) {
  if (!analyzed.exports.length) {
    return null;
  }
  const memberDefault = analyzed.exports.find((exp) => exp.token.left === "module" || exp.token.right === "default");
  let members = analyzed.exports.filter((exp) => exp.token.left !== "module" && exp.token.right !== "default").map((exp) => exp.token.right);
  members = [...new Set(members)];
  const membersDeclaration = members.map(
    (m) => `const __CJS__export_${m}__ = (module.exports == null ? {} : module.exports).${m}`
  );
  const membersExport = members.map((m) => `__CJS__export_${m}__ as ${m}`);
  if (memberDefault) {
    membersDeclaration.unshift(`const __CJS__export_default__ = (module.exports == null ? {} : module.exports).default || module.exports`);
    membersExport.unshift("__CJS__export_default__ as default");
  }
  return {
    polyfill: "var module = { exports: {} }; var exports = module.exports;",
    exportDeclaration: `
${membersDeclaration.join(";\n")};
export {
  ${membersExport.join(",\n  ")},
}
`.trim()
  };
}
const normallyImporteeRE = /^\.{1,2}\/[.-/\w]+(\.\w+)$/;
[
  ...node_module.builtinModules.map((m) => !m.startsWith("_")),
  ...node_module.builtinModules.map((m) => !m.startsWith("_")).map((m) => `node:${m}`)
];
function isCommonjs(code) {
  code = code.replace(multilineCommentsRE, "").replace(singlelineCommentsRE, "");
  return /\b(?:require|module|exports)\b/.test(code);
}
function relativeify(relative) {
  if (relative === "") {
    return ".";
  }
  if (!relative.startsWith(".")) {
    return "./" + relative;
  }
  return relative;
}
const isWindows = os__default.default.platform() === "win32";
function slash(p) {
  return p.replace(/\\/g, "/");
}
function normalizePath(id) {
  return path__default.default.posix.normalize(isWindows ? slash(id) : id);
}
function toLooseGlob(glob) {
  if (glob.includes("**"))
    return glob;
  const lastIndex = glob.lastIndexOf("*");
  let tail = "";
  if (lastIndex > -1) {
    tail = glob.slice(lastIndex + 1);
    glob = glob.slice(0, lastIndex + 1);
  }
  if (glob.endsWith("/*")) {
    return glob + "*/*" + tail;
  }
  if (glob.endsWith("*")) {
    return [glob + tail, glob + "/**" + (tail.startsWith("/") ? tail : "/*" + tail)];
  }
  return glob + tail;
}
function mappingPath(paths, alias) {
  const maps = {};
  for (const p of paths) {
    let importee = p;
    if (alias) {
      const [find, replacement] = Object.entries(alias)[0];
      importee = p.replace(find, replacement);
    }
    const ext = path$1__default.default.extname(importee);
    maps[p] = [
      importee.endsWith(`/index${ext}`) && importee.replace(`/index${ext}`, ""),
      importee.replace(ext, ""),
      importee
    ].filter(Boolean);
  }
  return maps;
}
class Resolve {
  constructor(config, resolve = config.createResolver()) {
    this.config = config;
    this.resolve = resolve;
  }
  async tryResolve(importee, importer) {
    return await this.tryResolveAlias(importee, importer) || this.tryResolveBare(importee, importer);
  }
  async tryResolveAlias(importee, importer) {
    const { importee: ipte, importeeRaw = ipte } = this.parseImportee(importee);
    const resolvedId = await this.resolve(ipte, importer, true);
    if (!resolvedId)
      return;
    const alias = this.config.resolve.alias.find(
      (a) => a.find instanceof RegExp ? a.find.test(ipte) : ipte.startsWith(a.find + "/")
    );
    if (!alias)
      return;
    const findString = alias.find instanceof RegExp ? alias.find.exec(importee)[0] : alias.find;
    const relativePath = alias.replacement.startsWith(".") ? alias.replacement : relativeify(path$1__default.default.posix.relative(path$1__default.default.dirname(importer), alias.replacement));
    const resolvedAlias = {
      ...alias,
      findString,
      relative: findString.endsWith("/") ? relativePath.endsWith("/") ? relativePath : relativePath + "/" : relativePath
    };
    return {
      type: "alias",
      ...this.resolveAlias(importeeRaw, importer, resolvedAlias)
    };
  }
  tryResolveBare(importee, importer) {
    const { importee: ipte, importeeRaw = ipte } = this.parseImportee(importee);
    if (/^[\.\/]/.test(ipte)) {
      return;
    }
    const paths = ipte.split("/");
    const node_modules = path$1__default.default.join(this.config.root, "node_modules");
    let level = "";
    let find, replacement;
    let p;
    while (p = paths.shift()) {
      level = path$1__default.default.posix.join(level, p);
      const fullPath = path$1__default.default.join(node_modules, level);
      if (fs__default.default.existsSync(fullPath)) {
        find = level;
        const relativePath = relativeify(path$1__default.default.posix.relative(path$1__default.default.dirname(importer), node_modules));
        replacement = `${relativePath}/${level}`;
      }
    }
    if (!find)
      return;
    const alias = {
      find,
      replacement,
      findString: find,
      relative: replacement.startsWith(".") ? replacement : relativeify(path$1__default.default.posix.relative(path$1__default.default.dirname(importer), replacement))
    };
    return {
      type: "bare",
      ...this.resolveAlias(importeeRaw, importer, alias)
    };
  }
  resolveAlias(importee, importer, alias) {
    const { find, replacement } = alias;
    let {
      importee: ipte,
      importeeRaw = ipte,
      startQuotation = ""
    } = this.parseImportee(importee);
    if (replacement.startsWith(".")) {
      ipte = ipte.replace(find, replacement);
    } else {
      const relativePath = relativeify(path$1__default.default.posix.relative(
        path$1__default.default.dirname(importer),
        normalizePath(replacement)
      ));
      ipte = ipte.replace(find instanceof RegExp ? find : find + "/", "");
      ipte = `${relativePath}/${ipte}`;
    }
    return {
      alias,
      import: {
        importee: importeeRaw,
        importer,
        resolved: startQuotation + ipte
      }
    };
  }
  parseImportee(importee) {
    const result = { importee };
    if (/^[`'"]/.test(importee)) {
      result.importee = importee.slice(1);
      result.importeeRaw = importee;
      result.startQuotation = importee.slice(0, 1);
    }
    return result;
  }
}
const example = "For example: import(`./foo/${bar}.js`).";
function sanitizeString(str) {
  if (str.includes("*")) {
    throw new Error("A dynamic import cannot contain * characters.");
  }
  return str;
}
function templateLiteralToGlob(node) {
  let glob = "";
  for (let i = 0; i < node.quasis.length; i += 1) {
    glob += sanitizeString(node.quasis[i].value.raw);
    if (node.expressions[i]) {
      glob += expressionToGlob(node.expressions[i]);
    }
  }
  return glob;
}
function callExpressionToGlob(node) {
  const { callee } = node;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier" && callee.property.name === "concat") {
    return `${expressionToGlob(callee.object)}${node.arguments.map(expressionToGlob).join("")}`;
  }
  return "*";
}
function binaryExpressionToGlob(node) {
  if (node.operator !== "+") {
    throw new Error(`${node.operator} operator is not supported.`);
  }
  return `${expressionToGlob(node.left)}${expressionToGlob(node.right)}`;
}
function expressionToGlob(node) {
  switch (node.type) {
    case "TemplateLiteral":
      return templateLiteralToGlob(node);
    case "CallExpression":
      return callExpressionToGlob(node);
    case "BinaryExpression":
      return binaryExpressionToGlob(node);
    case "Literal":
      return sanitizeString(node.value);
    default:
      return "*";
  }
}
async function dynamicImportToGlob(node, sourceString, resolver) {
  var _a;
  let glob = expressionToGlob(node);
  glob = (_a = await (resolver == null ? void 0 : resolver(glob))) != null ? _a : glob;
  if (!glob.includes("*") || glob.startsWith("data:")) {
    return null;
  }
  glob = glob.replace(/\*\*/g, "*");
  if (glob.startsWith("*")) {
    throw new Error(
      `invalid import "${sourceString}". It cannot be statically analyzed. Variable dynamic imports must start with ./ and be limited to a specific directory. ${example}`
    );
  }
  if (glob.startsWith("/")) {
    throw new Error(
      `invalid import "${sourceString}". Variable absolute imports are not supported, imports must start with ./ in the static part of the import. ${example}`
    );
  }
  if (!glob.startsWith("./") && !glob.startsWith("../")) {
    throw new Error(
      `invalid import "${sourceString}". Variable bare imports are not supported, imports must start with ./ in the static part of the import. ${example}`
    );
  }
  const ownDirectoryStarExtension = /^\.\/\*\.[\w]+$/;
  if (ownDirectoryStarExtension.test(glob)) {
    throw new Error(
      `invalid import "${sourceString}". Variable imports cannot import their own directory, place imports in a separate directory or make the import filename more specific. ${example}`
    );
  }
  if (path$1__default.default.extname(glob) === "") {
    throw new Error(
      `invalid import "${sourceString}". A file extension must be included in the static part of the import. ${example}`
    );
  }
  return glob;
}
class DynaimcRequire {
  constructor(config, options, resolve = new Resolve(config)) {
    this.config = config;
    this.options = options;
    this.resolve = resolve;
  }
  async generateRuntime(analyzed) {
    var _a, _b, _c;
    const options = this.options;
    const id = analyzed.id;
    let counter = 0;
    const importCache = /* @__PURE__ */ new Map();
    const records = [];
    for (const req of analyzed.require) {
      const { node, dynamic } = req;
      if (dynamic !== "dynamic")
        continue;
      const globResult = await globFiles(
        node,
        analyzed.code,
        analyzed.id,
        this.resolve,
        this.options.extensions,
        ((_a = options.dynamic) == null ? void 0 : _a.loose) !== false
      );
      if (!globResult)
        continue;
      const record = { node };
      let { files, resolved, normally } = globResult;
      files = files.filter((f) => normalizePath$1(path__default.default.join(path__default.default.dirname(id), f)) !== id);
      ((_b = options.dynamic) == null ? void 0 : _b.onFiles) && (files = ((_c = options.dynamic) == null ? void 0 : _c.onFiles(files, id)) || files);
      if (normally) {
        record.normally = normally;
        continue;
      }
      if (!(files == null ? void 0 : files.length))
        continue;
      const maps = mappingPath(
        files,
        resolved ? { [resolved.alias.relative]: resolved.alias.findString } : void 0
      );
      let counter2 = 0;
      record.dynaimc = {
        importee: [],
        runtimeName: `__matchRequireRuntime${counter}__`,
        runtimeFn: ""
      };
      const cases = [];
      for (const [localFile, importeeList] of Object.entries(maps)) {
        let dynamic_require2import = importCache.get(localFile);
        if (!dynamic_require2import) {
          importCache.set(
            localFile,
            dynamic_require2import = `__dynamic_require2import__${counter}__${counter2++}`
          );
        }
        record.dynaimc.importee.push(`import * as ${dynamic_require2import} from '${localFile}'`);
        cases.push(importeeList.map((importee) => `    case '${importee}':`).concat(`      return ${dynamic_require2import};`).join("\n"));
      }
      record.dynaimc.runtimeFn = `function ${record.dynaimc.runtimeName}(path) {
  switch(path) {
${cases.join("\n")}
    default: throw new Error("Cann't found module: " + path);
  }
}`;
      records.push(record);
    }
    return records.length ? records : null;
  }
}
async function globFiles(node, code, importer, resolve, extensions, loose = true) {
  let files;
  let resolved;
  let normally;
  const PAHT_FILL = "####/";
  const EXT_FILL = ".extension";
  let glob;
  let globRaw;
  glob = await dynamicImportToGlob(
    node.arguments[0],
    code.slice(node.start, node.end),
    async (raw) => {
      globRaw = raw;
      resolved = await resolve.tryResolve(raw, importer);
      if (resolved) {
        raw = resolved.import.resolved;
      }
      if (!path__default.default.extname(raw)) {
        raw = raw + EXT_FILL;
      }
      if (/^\.\/\*\.\w+$/.test(raw)) {
        raw = raw.replace("./*", `./${PAHT_FILL}*`);
      }
      return raw;
    }
  );
  if (!glob) {
    if (normallyImporteeRE.test(globRaw)) {
      normally = globRaw;
      return { normally };
    }
    return;
  }
  const globs = [].concat(loose ? toLooseGlob(glob) : glob).map((g) => {
    g.includes(PAHT_FILL) && (g = g.replace(PAHT_FILL, ""));
    g.endsWith(EXT_FILL) && (g = g.replace(EXT_FILL, ""));
    return g;
  });
  const fileGlobs = globs.map(
    (g) => path__default.default.extname(g) ? g : g + `.{${extensions.map((e) => e.replace(/^\./, "")).join(",")}}`
  );
  files = fastGlob__default.default.sync(fileGlobs, { cwd: path__default.default.dirname(importer) }).map((file) => relativeify$1(file));
  return { files, resolved };
}
function commonjs(options = {}) {
  let config;
  let extensions = DEFAULT_EXTENSIONS;
  let dynaimcRequire;
  return {
    // apply: "serve",
    name: "vite-plugin-commonjs",
    configResolved(_config) {
      var _a;
      config = _config;
      if ((_a = config.resolve) == null ? void 0 : _a.extensions)
        extensions = config.resolve.extensions;
      dynaimcRequire = new DynaimcRequire(_config, {
        ...options,
        extensions: [
          ...extensions,
          ...KNOWN_SFC_EXTENSIONS,
          ...KNOWN_ASSET_TYPES.map((type) => "." + type),
          ...KNOWN_CSS_TYPES.map((type) => "." + type)
        ]
      });
    },
    async transform(code, id) {
      id = id.split("?")[0]
      var _a;
      if (/node_modules\/(?!\.vite\/)/.test(id) && !id.includes("prism-include-languages"))
        return;
      if (!extensions.includes(path__default.default.extname(id)))
        return;
      if (!isCommonjs(code))
        return;
      if (((_a = options.filter) == null ? void 0 : _a.call(options, id)) === false)
        return;

      const ast = this.parse(code);
      const analyzed = analyzer(ast, code, id);
      const imports = generateImport(analyzed);
      const exportRuntime = id.includes("node_modules/.vite") ? null : generateExport(analyzed);
      const dynamics = await dynaimcRequire.generateRuntime(analyzed);
      const hoistImports = [];
      const ms = new MagicString(code);
      for (const impt of imports) {
        const {
          node,
          importee: imptee,
          declaration,
          importName,
          topScopeNode
        } = impt;
        const importee = imptee + ";";
        let importStatement;
        if (topScopeNode) {
          if (topScopeNode.type === TopScopeType.ExpressionStatement) {
            importStatement = importee;
          } else if (topScopeNode.type === TopScopeType.VariableDeclaration) {
            importStatement = declaration ? `${importee} ${declaration};` : importee;
          }
        } else {
          hoistImports.push(importee);
          importStatement = importName;
        }
        if (importStatement) {
          const start = topScopeNode ? topScopeNode.start : node.start;
          const end = topScopeNode ? topScopeNode.end : node.end;
          ms.overwrite(start, end, importStatement);
        }
      }
      if (hoistImports.length) {
        ms.prepend(["/* import-hoist-S */", ...hoistImports, "/* import-hoist-E */"].join(" "));
      }
      if (exportRuntime) {
        const polyfill = [
          "/* export-runtime-S */",
          exportRuntime.polyfill,
          "/* export-runtime-E */"
        ].join(" ");
        const _exports = [
          "/* export-statement-S */",
          exportRuntime.exportDeclaration,
          "/* export-statement-E */"
        ].filter(Boolean).join("\n");
        ms.prepend(polyfill).append(_exports);
      }
      if (dynamics) {
        const requires = [];
        const runtimes = [];
        let count = 0;
        for (const dynamic of dynamics) {
          const { node, normally, dynaimc: dymc } = dynamic;
          if (normally) {
            const name = `__require2import__${count++}__`;
            requires.push(`import * as ${name} from "${normally}";`);
            ms.overwrite(node.callee.start, node.callee.end, name);
          } else if (dymc) {
            requires.push(...dymc.importee.map((impt) => impt + ";"));
            runtimes.push(dymc.runtimeFn);
            ms.overwrite(node.callee.start, node.callee.end, dymc.runtimeFn);
          }
        }
        if (requires.length) {
          ms.prepend(["/* import-require2import-S */", ...requires, "/* import-require2import-E */"].join(" "));
        }
        if (runtimes.length) {
          ms.append(runtimes.join("\n"));
        }
      }
      const _code = ms.toString();
      return _code === code ? null : _code;
    }
  };
}
export default commonjs;
