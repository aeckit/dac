const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildLogPlugin = (name) => ({
  name: 'esbuild-log-plugin',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length > 0) {
        console.error(`[${name}] Build failed:`, result.errors);
      } else {
        console.log(`[${name}] Build successful`);
        if (name === 'webview') {
          try {
            fs.copyFileSync(
              path.join(__dirname, 'src', 'webview', 'style.css'),
              path.join(__dirname, 'dist', 'style.css')
            );
            console.log('[webview] Copied style.css successfully');
          } catch (err) {
            console.error('[webview] Failed to copy style.css:', err);
          }
        }
      }
    });
  },
});

async function main() {
  // 1. Compile Extension Host (Node)
  const extensionCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outfile: 'dist/extension.js',
    platform: 'node',
    target: 'node16',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [esbuildLogPlugin('extension')],
  });

  // 2. Compile Webview UI (Browser)
  const webviewCtx = await esbuild.context({
    entryPoints: ['src/webview/main.ts'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outfile: 'dist/webview.js',
    platform: 'browser',
    target: 'es2020',
    logLevel: 'silent',
    plugins: [esbuildLogPlugin('webview')],
  });

  if (watch) {
    await extensionCtx.watch();
    await webviewCtx.watch();
    console.log('Watching for code changes...');
  } else {
    await extensionCtx.rebuild();
    await webviewCtx.rebuild();
    await extensionCtx.dispose();
    await webviewCtx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
