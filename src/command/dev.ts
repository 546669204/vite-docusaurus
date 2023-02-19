import { createServer, mergeConfig } from "vite";
import resolveConfig from "./resolveConfig";
import * as server from "@docusaurus/core/lib/server"
import * as i18n from "@docusaurus/core/lib/server/i18n"
import * as aliases from "@docusaurus/core/lib/webpack/aliases"
import { realpath } from 'fs/promises';
import lodash from 'lodash'
import * as utils from "@docusaurus/utils";
import chokidar from "chokidar"
import path from "node:path"

export default async function dev(root: string, option: Record<string, any>) {
  const siteDirParam = "."

  const siteDir = await realpath(siteDirParam);

  const context = await server.loadContext({
    siteDir
  })
  const _i18n = await i18n.loadI18n(context.siteConfig, {});
  async function loadSite() {
    return server.load({
      siteDir,
      locale: option.locale || _i18n.defaultLocale
    });
  }
  const props = await loadSite()

  const alias = Object.assign({}, await aliases.loadThemeAliases(props), await aliases.loadDocusaurusAliases());

  // Reload files processing.
  const reload = lodash.debounce(() => {
    loadSite()
      .then(({ baseUrl: newBaseUrl }) => {

      })
      .catch((err) => {
        // logger.default.error(err.stack);
      });
  }, 500);

  const { siteConfig, plugins, localizationDir } = props;

  const normalizeToSiteDir = (filepath: any) => {
    if (filepath && path.isAbsolute(filepath)) {
      return utils.posixPath(path.relative(siteDir, filepath));
    }
    return utils.posixPath(filepath);
  };
  const pluginPaths = plugins
    .flatMap((plugin: { getPathsToWatch: () => any; }) => plugin.getPathsToWatch?.() ?? [])
    .filter(Boolean)
    .map(normalizeToSiteDir);

  const pathsToWatch = [...pluginPaths, props.siteConfigPath, localizationDir];
  const pollingOptions = {
    usePolling: !!option.poll,
    interval: Number.isInteger(option.poll)
      ? option.poll
      : undefined,
  };
  const fsWatcher = chokidar.watch(pathsToWatch, {
    cwd: siteDir,
    ignoreInitial: true,
    ...{ pollingOptions },
  });
  ['add', 'change', 'unlink', 'addDir', 'unlinkDir'].forEach((event) => fsWatcher.on(event, reload));

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