import { readFileSync } from "node:fs"
import { sync as resolve } from "resolve"
import { Plugin } from "vite";
import type { Props, LoadContext } from "@docusaurus/types"
import qs from "node:querystring"
import { readdirSync } from "fs-extra";
import path from "node:path"

const vitePluginDocusaurus = ({ context, alias, props, ssrBuild }: {
  context: LoadContext,
  alias: Record<string, any>,
  props: Props,
  ssrBuild?: boolean,
}) => {
  return {
    name: "vite-plugin-docusaurus",
    enforce: 'pre',
    load(id) {
      if (id.endsWith("registry.js")) {
        const m = {
          "~docs": context.generatedFilesDir + "/docusaurus-plugin-content-docs/",
          "~pages": context.generatedFilesDir + "/docusaurus-plugin-content-pages/",
          "~blog": context.generatedFilesDir + "/docusaurus-plugin-content-blog/",
          "~debug": context.generatedFilesDir + "/docusaurus-plugin-debug/",
        };
        const keys = Object.keys(m) as ("~docs" | "~pages" | "~blog" | "~debug")[];
        let text = keys.reduce((acc, v) => (acc.replaceAll(v, m[v])), readFileSync(id).toString());
        const arr = [...text.matchAll(/require\.resolveWeak\((.*)\)/gi)]
        for (const a of arr) {
          let moduleName = eval(a[1])
          if (alias[moduleName]) {
            text = text.replaceAll(a[0], JSON.stringify(alias[moduleName]));
            continue
          }
          let path2 = resolve(
            moduleName.replace("@site", props.siteDir).replace("@generated", props.generatedFilesDir).replace(/\?(.*?)$/, ''),
            {
              extensions: [".js", ".mjs", ".json", ".md"]
            }
          );
          text = text.replaceAll(a[0], JSON.stringify(path2));
        }
        return text
      }
      if (id.endsWith("client-modules.js") && ssrBuild) {
        let text = readFileSync(id).toString();
        text = text.replaceAll("require", "String")
        return text;
      }
      if (/lib\/theme\/prism-include-languages\.js/.test(id)) {
        const prismComponentPath = path.dirname(require.resolve("prismjs/components/prism-c"))
        const list = readdirSync(prismComponentPath);
        return `
import siteConfig from '@generated/docusaurus.config';
export default async function prismIncludeLanguages(PrismObject) {
const {
themeConfig: {prism},
} = siteConfig;
const {additionalLanguages} = prism;
globalThis.Prism = PrismObject;
for (const lang of additionalLanguages){
await matchRequire(\`prismjs/components/prism-\${lang}\`);
}
delete globalThis.Prism;
}
function matchRequire(path){
switch(path){
${list.filter(name => name.startsWith("prism-")).map(name => {
    return `            case "prismjs/components/${name.replace(/\.js$/,'')}": 
    case "prismjs/components/${name}":
        return import('${path.join(prismComponentPath, name)}');\n`
}).join('')}
default: throw new Error("Cann't found module: " + path);
}
}
`

    }
      const [modulePath, queryStr = ''] = id.split("?");
      const query = qs.parse(queryStr)
      if (query && "raw" in query) {
        return `export default ${JSON.stringify(readFileSync(modulePath).toString())}`
      }
      if (query && "url" in query) {
        let referenceId = this.emitFile({
          source: readFileSync(modulePath).toString(),
          type: 'asset',
        })
        return `export default import.meta.ROLLUP_FILE_URL_${referenceId}`
      }
    }
  } as Plugin
}

export default vitePluginDocusaurus;