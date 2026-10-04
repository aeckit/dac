#!/usr/bin/env node

import { cac } from 'cac';
import fs from 'fs';
import path from 'path';
import picocolors from 'picocolors';
import { solveDocumentGeometry, solveSheetDocument } from '@aeckit/dac-json-solver';
import { generateId } from '@aeckit/dac-schema';

const cli = cac('dac');

function checkDocument(doc: any) {
  const allWarnings: Array<{ componentId?: string; componentType?: string; message: string }> = [];
  try {
    if (doc.type === 'CAD::SheetConfiguration') {
      const layout = solveSheetDocument(doc, {}, new Map(), undefined, 0, 0, doc.paperSize || 'ARCH D');
      if (layout.titleBlockGroups) {
        layout.titleBlockGroups.forEach(g => {
          if (g.warnings) g.warnings.forEach(w => allWarnings.push({ componentId: g.componentId, componentType: g.componentType, message: w.message }));
        });
      }
      if (layout.sheetGeometryGroups) {
        layout.sheetGeometryGroups.forEach(g => {
          if (g.warnings) g.warnings.forEach(w => allWarnings.push({ componentId: g.componentId, componentType: g.componentType, message: w.message }));
        });
      }
      layout.viewports.forEach(vp => {
        vp.resolvedDetailGroups.forEach(g => {
          if (g.warnings) g.warnings.forEach(w => allWarnings.push({ componentId: g.componentId, componentType: g.componentType, message: w.message }));
        });
      });
    } else {
      const groups = solveDocumentGeometry(doc, 1.0);
      groups.forEach(g => {
        if (g.warnings) g.warnings.forEach(w => allWarnings.push({ componentId: g.componentId, componentType: g.componentType, message: w.message }));
      });
    }
  } catch (e: any) {
    allWarnings.push({ message: `Solver crashed during evaluation: ${e.message}` });
  }
  return allWarnings;
}

function fixMissingIds(doc: any): boolean {
  let changed = false;
  
  const injectId = (shape: any, defaultPrefix: string) => {
    if (!shape.componentId) {
      const prefix = shape.type ? shape.type.split('::').pop().toLowerCase() : defaultPrefix;
      shape.componentId = generateId(prefix);
      changed = true;
    }
  };

  if (doc.geometry) {
    doc.geometry.forEach((shape: any) => injectId(shape, 'shape'));
  }
  if (doc.titleblocks) {
    doc.titleblocks.forEach((tb: any) => injectId(tb, 'titleblock'));
  }
  if (doc.viewports) {
    doc.viewports.forEach((vp: any) => injectId(vp, 'viewport'));
  }
  return changed;
}

cli
  .command('check <file>', 'Check a Drawing-as-Code JSON file for schema warnings and errors')
  .option('--json', 'Output results in JSON format for programmatic consumption')
  .option('--fix-all', 'Automatically apply all safe fixes to the document')
  .option('--fix <type>', 'Apply specific fixes (e.g. --fix=ids)')
  .action((file: string, options: { json?: boolean, fixAll?: boolean, fix?: string }) => {
    const filePath = path.resolve(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      if (options.json) {
        console.log(JSON.stringify({ file, status: 'error', warnings: [{ message: 'File not found' }] }));
      } else {
        console.error(picocolors.red(`❌ Error: File not found at ${filePath}`));
      }
      process.exit(1);
    }

    let fileContent = '';
    try {
      fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch (e: any) {
      if (options.json) {
        console.log(JSON.stringify({ file, status: 'error', warnings: [{ message: `Failed to read file: ${e.message}` }] }));
      } else {
        console.error(picocolors.red(`❌ Error: Failed to read file: ${e.message}`));
      }
      process.exit(1);
    }

    let doc: any;
    try {
      doc = JSON.parse(fileContent);
    } catch (e: any) {
      if (options.json) {
        console.log(JSON.stringify({ file, status: 'error', warnings: [{ message: `Invalid JSON syntax: ${e.message}` }] }));
      } else {
        console.error(picocolors.red(`❌ Error: Invalid JSON syntax in ${file}`));
        console.error(picocolors.yellow(`  ${e.message}`));
      }
      process.exit(1);
    }

    if (!doc || typeof doc !== 'object' || !doc.type) {
      if (options.json) {
        console.log(JSON.stringify({ file, status: 'error', warnings: [{ message: 'Document is missing a required "type" property.' }] }));
      } else {
        console.error(picocolors.red(`❌ Error: Document is missing a required "type" property.`));
      }
      process.exit(1);
    }

    let fixesApplied = 0;
    const shouldFixIds = options.fixAll || options.fix === 'ids';

    if (shouldFixIds) {
      const fixed = fixMissingIds(doc);
      if (fixed) {
        fixesApplied++;
        fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf-8');
        if (!options.json) {
          console.log(picocolors.green(`🔧 Fixed: Injected missing componentIds into ${file}`));
        }
      }
    }

    const allWarnings = checkDocument(doc);

    if (allWarnings.length > 0) {
      if (options.json) {
        console.log(JSON.stringify({ file, status: 'failed', fixesApplied, warnings: allWarnings }, null, 2));
      } else {
        console.log(picocolors.red(`\n❌ Found ${allWarnings.length} warning(s) in ${file}:\n`));
        allWarnings.forEach(w => {
          const prefix = w.componentId ? picocolors.cyan(`[${w.componentId} | ${w.componentType}]`) : picocolors.cyan('[Document]');
          console.log(`  ${prefix} ${picocolors.yellow(w.message)}`);
        });
        
        const hasMissingIdWarning = allWarnings.some(w => w.message.includes('Missing componentId'));
        if (hasMissingIdWarning && !shouldFixIds) {
          console.log(picocolors.magenta(`\n💡 Tip: Run with --fix-all or --fix=ids to automatically inject missing IDs.`));
        }
        console.log('');
      }
      process.exit(1);
    } else {
      if (options.json) {
        console.log(JSON.stringify({ file, status: 'success', fixesApplied, warnings: [] }));
      } else {
        console.log(picocolors.green(`✅ Passed! No warnings found in ${file}.`));
      }
      process.exit(0);
    }
  });

cli.help();
cli.version('0.1.0');

cli.parse();
