#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { parse } from '@babel/parser';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function detectSkippedTests(code, filePath) {
  const skipped = [];
  try {
    let visit2 = function(node) {
      if (node.type === "CallExpression") {
        const callee = node.callee;
        if (callee.type === "MemberExpression" && callee.property.type === "Identifier" && callee.property.name === "skip" && callee.object.type === "Identifier") {
          const testType = callee.object.name;
          if (testType === "describe" || testType === "it" || testType === "test") {
            let name;
            if (node.arguments.length > 0) {
              const firstArg = node.arguments[0];
              if (firstArg.type === "StringLiteral") {
                name = firstArg.value;
              } else if (firstArg.type === "TemplateLiteral" && firstArg.quasis.length === 1) {
                name = firstArg.quasis[0].value.raw;
              }
            }
            skipped.push({
              type: testType,
              name,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
              file: filePath
            });
          }
        }
      }
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (value && typeof value === "object") {
          if (Array.isArray(value)) {
            for (const item of value) {
              if (item && typeof item === "object" && "type" in item) {
                visit2(item);
              }
            }
          } else if ("type" in value) {
            visit2(value);
          }
        }
      }
    };
    var visit = visit2;
    __name(visit2, "visit");
    const ast = parse(code, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx"
      ],
      errorRecovery: true
    });
    visit2(ast.program);
    return {
      file: filePath,
      skipped,
      parsed: true
    };
  } catch (error) {
    return {
      file: filePath,
      skipped: [],
      parsed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
__name(detectSkippedTests, "detectSkippedTests");
function analyzeSkippedTests(files) {
  const results = [];
  for (const [filePath, content] of files) {
    if (filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("__tests__")) {
      results.push(detectSkippedTests(content, filePath));
    }
  }
  return results;
}
__name(analyzeSkippedTests, "analyzeSkippedTests");
function getSkippedTestSummary(results) {
  const summary = {
    totalSkipped: 0,
    byType: {
      describe: 0,
      it: 0,
      test: 0
    },
    filesWithSkipped: []
  };
  for (const result of results) {
    if (result.skipped.length > 0) {
      summary.filesWithSkipped.push(result.file);
      summary.totalSkipped += result.skipped.length;
      for (const test of result.skipped) {
        summary.byType[test.type]++;
      }
    }
  }
  return summary;
}
__name(getSkippedTestSummary, "getSkippedTestSummary");

export { analyzeSkippedTests, detectSkippedTests, getSkippedTestSummary };
//# sourceMappingURL=chunk-ZIIRQODJ.js.map
//# sourceMappingURL=chunk-ZIIRQODJ.js.map