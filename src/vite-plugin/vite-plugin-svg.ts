import { readFileSync } from "fs"
import vite, { Plugin } from "vite"
import path from "path"
import { getFilePath } from "./utils"
import { Props } from "@docusaurus/types"

const vitePluginSvg = async ({ props }: { props: Props }) => {
  return {
    name: "vite-plugin-svg",
    enforce: "pre",
    resolveId(source, importer) {
      if (source.endsWith('.svg') && importer) {
        return path.resolve(path.dirname(importer), source);
      }
    },
    async load(id, options?) {
      if (id.includes(".svg")) {
        return `import React from "react";
        export default function Svg(props){
          return ${(await vite.transformWithEsbuild(readFileSync(getFilePath(id, props.siteDir)).toString(), id, {
          loader: "jsx"
        })).code.replace(`("svg", {`, `("svg", {...props,`)}
        }`
      }
    },
  } as Plugin
}

export default vitePluginSvg;