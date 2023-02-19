import { readFileSync } from "node:fs"
import path from "node:path"
import vite from "vite";
// @ts-ignore
import { createCompiler } from '@mdx-js/mdx'
import stringifyObject from 'stringify-object';
import {
  parseFrontMatter,
  parseMarkdownContentTitle,
  escapePath,
  getFileLoaderUtils,
  aliasedSitePath,
  docuHash,
  createAbsoluteFilePathMatcher,
  getContentPathList,
  addTrailingPathSeparator,
  getPluginI18nPath
} from '@docusaurus/utils';
import { readVersionsMetadata } from '@docusaurus/plugin-content-docs/lib/versions/index.js';
import headings from '@docusaurus/mdx-loader/lib/remark/headings';
import toc from '@docusaurus/mdx-loader/lib/remark/toc';
import unwrapMdxCodeBlocks from '@docusaurus/mdx-loader/lib/remark/unwrapMdxCodeBlocks';
import transformImage from './remark/transformImage';
import transformLinks from './remark/transformLinks';
import mermaid from '@docusaurus/mdx-loader/lib/remark/mermaid';
import transformAdmonitions from '@docusaurus/mdx-loader/lib/remark/admonitions';
import { mkdir, readFile, realpath, writeFile } from 'fs/promises';
import { Plugin } from "vite"
import qs from "node:querystring"
import { getFilePath, toPosixPath } from "./utils"
import { Props } from "@docusaurus/types"

const vitePluginMdx = async ({ props }: { props: Props }) => {
  let hooks: [any, Function][] = [];
  let build = {
    onLoad(regexp: { filter: RegExp }, cb: Function) {
      hooks.push([regexp, cb])
    }
  }
  for (const plugin of props.plugins.filter(plugin => plugin.name.includes("content"))) {
    const options = plugin.options as any;
    let context = props;
    const { generatedFilesDir, localizationDir } = context;
    const pluginId = options.id;
    const pluginDataDirRoot = path.join(
      generatedFilesDir,
      plugin.name,
    );
    const dataDir = path.join(pluginDataDirRoot, pluginId);
    let contentDirs: any[], createAssets

    if (plugin.name.includes("docs")) {
      const versionsMetadata = await readVersionsMetadata({ context, options });
      contentDirs = versionsMetadata
        .flatMap(getContentPathList)
        // Trailing slash is important, see https://github.com/facebook/docusaurus/pull/3970
        .map(addTrailingPathSeparator);
      createAssets = ({
        frontMatter,
      }: {
        frontMatter: any
      }) => ({
        image: frontMatter.image,
      });
    } else {
      const contentPaths = {
        contentPath: path.resolve(props.siteDir, options.path),
        contentPathLocalized: getPluginI18nPath({
          localizationDir,
          pluginName: plugin.name,
          pluginId: options.id,
        }),
      };
      contentDirs = getContentPathList(contentPaths);
      createAssets = ({ frontMatter, metadata }: { frontMatter: { [key: string]: unknown }, metadata: { authors: { imageURL: string }[] } }) => ({
        image: frontMatter.image,
        authorsImageUrls: metadata.authors?.map((author) => author.imageURL) || [],
      })
    }

    const pragma = `
  /* @jsxRuntime classic */
  /* @jsx mdx */
  /* @jsxFrag React.Fragment */
  `;
    const {
      admonitions,
      rehypePlugins,
      remarkPlugins,
      truncateMarker,
      beforeDefaultRemarkPlugins,
      beforeDefaultRehypePlugins,
    } = options;
    const reqOptions = {
      admonitions: admonitions,
      remarkPlugins,
      rehypePlugins,
      beforeDefaultRehypePlugins,
      beforeDefaultRemarkPlugins,
      staticDirs: context.siteConfig.staticDirectories.map((dir) =>
        path.resolve(props.siteDir, dir),
      ),
      siteDir: props.siteDir,
      isMDXPartial: createAbsoluteFilePathMatcher(
        options.exclude,
        contentDirs,
      ),
      metadataPath: (mdxPath: string) => {
        // Note that metadataPath must be the same/in-sync as
        // the path from createData for each MDX.
        const aliasedPath = aliasedSitePath(mdxPath, props.siteDir);
        return path.join(dataDir, `${docuHash(aliasedPath)}.json`);
      },
      // Assets allow to convert some relative images paths to
      // require(...) calls
      createAssets,
      markdownConfig: context.siteConfig.markdown,
      removeContentTitle: plugin.name.includes("blog")
    };
    async function c() {
      const DEFAULT_OPTIONS = {
        admonitions: true,
        rehypePlugins: [],
        remarkPlugins: [unwrapMdxCodeBlocks, (await import('remark-emoji')).default, headings, toc],
        beforeDefaultRemarkPlugins: [],
        beforeDefaultRehypePlugins: [],
      };
      const remarkPlugins = [
        ...(reqOptions.beforeDefaultRemarkPlugins ?? []),
        ...getAdmonitionsPlugins(reqOptions.admonitions ?? false),
        ...DEFAULT_OPTIONS.remarkPlugins,
        ...(reqOptions.markdownConfig?.mermaid ? [mermaid] : []),
        [
          transformImage,
          {
            staticDirs: reqOptions.staticDirs,
            siteDir: reqOptions.siteDir,
          },
        ],
        [
          transformLinks,
          {
            staticDirs: reqOptions.staticDirs,
            siteDir: reqOptions.siteDir,
          },
        ],
        ...(reqOptions.remarkPlugins ?? []),
      ];

      const rehypePlugins = [
        ...(reqOptions.beforeDefaultRehypePlugins ?? []),
        ...DEFAULT_OPTIONS.rehypePlugins,
        ...(reqOptions.rehypePlugins ?? []),
      ];

      const options = {
        ...reqOptions,
        remarkPlugins,
        rehypePlugins,
      };
      return createCompiler(options)
    }
    const compiler = await c()
    build.onLoad({ filter: /\.mdx?/ }, async (data: { path: string }) => {
      // include
      if (contentDirs.every(cd => !data.path.startsWith(cd))) {
        return
      }
      const [filePath, queryStr] = data.path.split("?")
      const query = qs.parse(queryStr)
      const fileString = (await readFile(filePath)).toString();
      const { frontMatter, content: contentWithTitle } = parseFrontMatter(fileString);
      const { content, contentTitle } = parseMarkdownContentTitle(contentWithTitle, {
        removeContentTitle: reqOptions.removeContentTitle,
      });
      const { contents: result } = await compiler.process({ contents: content, path: filePath, })
      if ("compoent" in query) {
        return {
          contents: `  ${pragma}
        import React from 'react';
        import { mdx } from '@mdx-js/react';
        ${result.replace("export const toc", "const toc")}`
        }
      }

      const hasFrontMatter = Object.keys(frontMatter).length > 0;


      const isMDXPartial = reqOptions.isMDXPartial?.(filePath);
      if (isMDXPartial && hasFrontMatter) {
        const errorMessage = `Docusaurus MDX partial files should not contain front matter.
    Those partial files use the _ prefix as a convention by default, but this is configurable.
    File at ${filePath} contains front matter that will be ignored:
    ${JSON.stringify(frontMatter, null, 2)}`;

        if (!options.isMDXPartialFrontMatterWarningDisabled) {
          const shouldError = process.env.NODE_ENV === 'test' || process.env.CI;
          if (shouldError) {
            throw (new Error(errorMessage));
          }
          // logger.warn(errorMessage);
        }
      }
      function getMetadataPath() {
        if (!isMDXPartial) {
          // Read metadata for this MDX and export it.
          if (reqOptions.metadataPath && typeof reqOptions.metadataPath === 'function') {
            return reqOptions.metadataPath(filePath);
          }
        }
        return undefined;
      }

      const metadataPath = getMetadataPath();
      // if (metadataPath) {
      //   this.addDependency(metadataPath);
      // }

      const metadataJsonString = metadataPath
        ? await readMetadataPath(metadataPath)
        : undefined;

      const metadata = metadataJsonString
        ? (JSON.parse(metadataJsonString))
        : undefined;

      const assets =
        // @ts-ignore
        reqOptions.createAssets && metadata
          ? reqOptions.createAssets({ frontMatter, metadata })
          : undefined;

      const exportsCode = `
  export const frontMatter = ${stringifyObject(frontMatter)};
  export const contentTitle = ${stringifyObject(contentTitle)};
  ${metadataJsonString ? `export const metadata = ${metadataJsonString};` : ''}
  ${assets ? `export const assets = ${createAssetsExportCode(assets)};` : ''}
  `;

      const code = `
  ${pragma}
  import React from 'react';
  import { mdx } from '@mdx-js/react';
  ${exportsCode}
  export { default } from '${toPosixPath(filePath)}?compoent'
${result.replace("export default", "")} 

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
    }
  })
}
  `;
      return {
        contents: code,
        loader: "jsx",
        // errors:[],
        // warnings:[],
        resolveDir: path.dirname(data.path)
      }
    })

  }

  return {
    name: "vite-plugin-mdx",
    enforce: 'pre',
    config() {
      return {
        server: {
          watch: {
            ignored: ['!**/*.md'],
          },
        },
      }
    },
    handleHotUpdate(ctx) {
      let modules = ctx.server.moduleGraph.getModulesByFile(ctx.file + ".jsx");
      if (!modules) {
        modules = ctx.server.moduleGraph.getModulesByFile("/" + path.relative(props.siteDir, ctx.file) + ".jsx");
      }
      if (modules) {
        return [...modules.values()].filter(v => v.id?.includes("?compoent"))
      }
    },
    resolveId(source, importer, options) {
      const [id, option = ''] = source.split("?");
      if (/\.mdx?$/.test(id)) {
        this.addWatchFile(id)
        return {
          id: id + ".jsx?" + option,
          // external: "absolute",
          resolveDir: path.dirname(id)
        }
      }
      return null;
    },
    async load(id) {
      const [modulePath, queryStr = ''] = id.split("?");
      const query = qs.parse(queryStr)
      for (const [regexp, cb] of hooks) {
        if (/\.mdx?\.jsx$/.test(modulePath) && regexp.filter.test(modulePath)) {
          const filePath = modulePath.replace(/\.jsx$/, '').replace("\x00", '')

          const reg = await cb({ path: getFilePath(filePath, props.siteDir) + "?" + queryStr });
          if (reg) {
            // const res = await vite.transformWithEsbuild(
            //   reg.contents,
            //   id,
            //   {
            //     loader: 'jsx',
            //     // format: "esm"
            //   }
            // )
            // return res.code

            return reg.contents
          };
        }
      }
      if (/\.js$/.test(modulePath) && !modulePath.startsWith("\x00")) {
        const res = await vite.transformWithEsbuild(
          readFileSync(id.replace(/\?(.*?)$/, '')).toString(),
          id,
          {
            loader: 'jsx',
            // format: "esm"
          }
        )
        return res.code
      }
    }
  } as Plugin
}



async function readMetadataPath(metadataPath: string) {
  try {
    return await readFile(metadataPath, 'utf8');
  } catch (err) {
    // logger.error`MDX loader can't read MDX metadata file path=${metadataPath}. Maybe the isMDXPartial option function was not provided?`;
    throw err;
  }
}
function createAssetsExportCode(assets: any) {
  if (
    typeof assets !== 'object' ||
    !assets ||
    Object.keys(assets).length === 0
  ) {
    return 'undefined';
  }

  // TODO implementation can be completed/enhanced
  function createAssetValueCode(assetValue: any): string | undefined {
    if (Array.isArray(assetValue)) {
      const arrayItemCodes = assetValue.map(
        (item) => createAssetValueCode(item) ?? 'undefined',
      );
      return `[${arrayItemCodes.join(', ')}]`;
    }
    // Only process string values starting with ./
    // We could enhance this logic and check if file exists on disc?
    if (typeof assetValue === 'string' && assetValue.startsWith('./')) {
      // TODO do we have other use-cases than image assets?
      // Probably not worth adding more support, as we want to move to Webpack 5 new asset system (https://github.com/facebook/docusaurus/pull/4708)
      const inlineLoader = '';
      return `require("${inlineLoader}${escapePath(assetValue)}").default`;
    }
    return undefined;
  }

  const assetEntries = Object.entries(assets);

  const codeLines = assetEntries
    .map(([key, value]) => {
      const assetRequireCode = createAssetValueCode(value);
      return assetRequireCode ? `"${key}": ${assetRequireCode},` : undefined;
    })
    .filter(Boolean);

  return `{\n${codeLines.join('\n')}\n}`;
}

function getAdmonitionsPlugins(
  admonitionsOption: any
) {
  if (admonitionsOption) {
    const plugin =
      admonitionsOption === true
        ? transformAdmonitions
        : [transformAdmonitions, admonitionsOption];
    return [plugin];
  }
  return [];
}
export default vitePluginMdx;