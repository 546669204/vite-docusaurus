
import { createServer, mergeConfig, build as viteBuild } from "vite";
import resolveConfig from "./resolveConfig";
import * as server from "@docusaurus/core/lib/server"
import * as i18n from "@docusaurus/core/lib/server/i18n"
import * as aliases from "@docusaurus/core/lib/webpack/aliases"
import { realpath } from 'fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { copySync } from "fs-extra"
import path from "path";
import ssr_html_template from "@docusaurus/core/lib/webpack/templates/ssr.html.template";
import { DOCUSAURUS_VERSION } from '@docusaurus/utils';


function pathToAssetName(outputPath: string, trailingSlash: boolean | undefined) {
  const preferFoldersOutput = trailingSlash;
  const outputFileName = outputPath.replace(/^(\/|\\)/, ''); // Remove leading slashes for webpack-dev-server

  // Paths ending with .html are left untouched
  if (/\.(html?)$/i.test(outputFileName)) {
    return outputFileName;
  }

  // Legacy retro-compatible behavior
  if (typeof preferFoldersOutput === 'undefined') {
    return path.join(outputFileName, 'index.html');
  }

  // New behavior: we can say if we prefer file/folder output
  // Useful resource: https://github.com/slorber/trailing-slash-guide
  if (outputPath === '' || outputPath.endsWith('/') || preferFoldersOutput) {
    return path.join(outputFileName, 'index.html');
  } else {
    return `${outputFileName}.html`;
  }
}

export default async function build() {
  process.env.NODE_ENV = "production";
  const siteDirParam = "."

  const siteDir = await realpath(siteDirParam);

  const context = await server.loadContext({
    siteDir
  })
  const _i18n = await i18n.loadI18n(context.siteConfig, {});

  for (const locale of _i18n.locales) {
    const props = await server.load({
      siteDir,
      locale
    });

    const alias = Object.assign({}, await aliases.loadThemeAliases(props), await aliases.loadDocusaurusAliases());

    await viteBuild(mergeConfig({
      configFile: false,
      build: {
        outDir: "dist/client"
      }
    }, await resolveConfig({
      context, alias, props
    })({ mode: "production", ssrBuild: false, command: "build" }), false));
    await viteBuild(mergeConfig({
      configFile: false,
      mode: "production",
      build: {
        outDir: "dist/server",
        ssr: require.resolve("../../entry-server.ts")
      }
    }, await resolveConfig({
      context, alias, props
    })({ mode: "production", ssrBuild: true, command: "build" }), false));



    let obj = JSON.parse(readFileSync(path.join(process.cwd(), "dist/client/manifest.json")).toString());

    writeFileSync(path.join(props.generatedFilesDir, "client-manifest.json"), JSON.stringify({
      entrypoints: ["main"],
      origins: {
        main: [
          // "index.html",
          // "style.css"
        ]
      },
      assets: {
      },
    }))



    const { default: render } = require(path.join(process.cwd(), "dist/server/entry-server.js"));
    const { baseUrl, routesPaths, generatedFilesDir, headTags, preBodyTags, postBodyTags, siteConfig: { noIndex, trailingSlash, ssrTemplate }, outDir } = props;
    copySync("dist/client", outDir)
    const routesLocation: Record<string, string> = {};
    const ssgPaths = routesPaths.map((str) => {
      const ssgPath = baseUrl === '/' ? str : str.replace(new RegExp(`^${baseUrl}`), '/');
      routesLocation[ssgPath] = str;
      return ssgPath;
    });
    for (const ssgPath of ssgPaths) {
      try {
        const html = await render({
          baseUrl,
          generatedFilesDir,
          routesLocation,
          headTags,
          preBodyTags:preBodyTags.concat(`
<script type="module" crossorigin src="${props.baseUrl}${obj["node_modules/vite-docusaurus/index.html"].file}"></script>
<link rel="stylesheet" href="${props.baseUrl}${obj["style.css"].file}">
<script type="module">try{import.meta.url;import("_").catch(()=>1);}catch(e){}window.__vite_is_modern_browser=true;</script>
<script type="module">!function(){if(window.__vite_is_modern_browser)return;console.warn("vite: loading legacy build because dynamic import or import.meta.url is unsupported, syntax error above should be ignored");var e=document.getElementById("vite-legacy-polyfill"),n=document.createElement("script");n.src=e.src,n.onload=function(){System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))},document.body.appendChild(n)}();</script>
                    `),
                    postBodyTags: postBodyTags.concat(`
<script>
var module = {};
let __webpack_require__ = {
    gca(){
        console.log(arguments)
    }
}
</script>
<script nomodule>!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();</script>
<script nomodule crossorigin id="vite-legacy-polyfill" src="${props.baseUrl}${obj["vite/legacy-polyfills-legacy"].file}"></script>
<script nomodule crossorigin id="vite-legacy-entry" data-src="${props.baseUrl}${obj["node_modules/vite-docusaurus/index-legacy.html"].file}">System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))</script>
                    `),
          onLinksCollected() { },
          onHeadTagsCollected() { },
          ssrTemplate: ssrTemplate ?? ssr_html_template,
          noIndex,
          DOCUSAURUS_VERSION: DOCUSAURUS_VERSION,
          path: routesLocation[ssgPath]
        })
        const assetName = pathToAssetName(ssgPath, trailingSlash);
        mkdirSync(path.dirname(path.join(outDir, assetName)), { recursive: true })
        writeFileSync(path.join(outDir, assetName), html)
      } catch (error) {
        console.log(error)
      }
    }
  }

}