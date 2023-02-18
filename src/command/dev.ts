import { createServer, mergeConfig } from "vite";
import resolveConfig from "./resolveConfig";
import * as server from "@docusaurus/core/lib/server"
import * as i18n from "@docusaurus/core/lib/server/i18n"
import * as aliases from "@docusaurus/core/lib/webpack/aliases"
import { realpath } from 'fs/promises';

export default async function dev(root: string, option: Record<string, any>) {
  const siteDirParam = "."

  const siteDir = await realpath(siteDirParam);

  const context = await server.loadContext({
    siteDir
  })
  const _i18n = await i18n.loadI18n(context.siteConfig, {});
  const props = await server.load({
    siteDir,
    locale: option.locale || _i18n.defaultLocale
  });

  const alias = Object.assign({}, await aliases.loadThemeAliases(props), await aliases.loadDocusaurusAliases());
  const config = mergeConfig({
    configFile: false,
    build: {
      outDir: "dist/client"
    }
  }, await resolveConfig({
    context, alias, props
  })({ mode: "development", ssrBuild: false, command: "serve" }), false)



  const app = await createServer(config);
  await app.listen()
  app.printUrls()
}