#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { parseSync } from 'oxc-parser';
import { dirname, resolve, relative, basename } from 'path';
import * as eslintParser from '@typescript-eslint/parser';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var TS_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts"
]);
var JSX_EXTENSIONS = /* @__PURE__ */ new Set([
  ".tsx",
  ".jsx"
]);
var ALL_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs"
]);
function isSupportedFile(filePath) {
  const ext = getExtension(filePath);
  return ALL_EXTENSIONS.has(ext);
}
__name(isSupportedFile, "isSupportedFile");
function parseSource(content, filePath) {
  const ext = getExtension(filePath);
  try {
    const lang = JSX_EXTENSIONS.has(ext) ? TS_EXTENSIONS.has(ext) ? "tsx" : "jsx" : TS_EXTENSIONS.has(ext) ? "ts" : "js";
    const result = parseSync(filePath, content, {
      sourceType: "module",
      lang
    });
    const errors = Array.isArray(result.errors) ? result.errors.map((e) => normalizeError(e)) : [];
    return {
      program: result.program,
      errors,
      success: errors.length === 0
    };
  } catch (error) {
    return {
      program: {
        type: "Program",
        body: [],
        sourceType: "module"
      },
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          severity: "error"
        }
      ],
      success: false
    };
  }
}
__name(parseSource, "parseSource");
function walkAST(node, visitor, parent) {
  if (!node || typeof node !== "object") {
    return;
  }
  const n = node;
  if (typeof n.type === "string") {
    visitor(n, parent);
  }
  for (const key of Object.keys(n)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") {
      continue;
    }
    const value = n[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && typeof item.type === "string") {
          walkAST(item, visitor, n);
        }
      }
    } else if (value && typeof value === "object" && typeof value.type === "string") {
      walkAST(value, visitor, n);
    }
  }
}
__name(walkAST, "walkAST");
function countASTNodes(program) {
  let count = 0;
  walkAST(program, () => {
    count++;
  });
  return count;
}
__name(countASTNodes, "countASTNodes");
function offsetToLine(source, offset) {
  if (offset < 0 || offset > source.length) {
    return 1;
  }
  let line = 1;
  for (let i = 0; i < offset; i++) {
    if (source[i] === "\n") {
      line++;
    }
  }
  return line;
}
__name(offsetToLine, "offsetToLine");
function getExtension(filePath) {
  const lastDot = filePath.lastIndexOf(".");
  return lastDot >= 0 ? filePath.substring(lastDot).toLowerCase() : "";
}
__name(getExtension, "getExtension");
function normalizeError(e) {
  if (typeof e === "object" && e !== null) {
    const err = e;
    return {
      message: String(err.message ?? err),
      severity: String(err.severity ?? "error"),
      labels: Array.isArray(err.labels) ? err.labels : void 0
    };
  }
  return {
    message: String(e),
    severity: "error"
  };
}
__name(normalizeError, "normalizeError");

// ../../packages/core/dist/analysis/ast/ComplexityAnalyzer.js
var THRESHOLDS = {
  /** Cyclomatic complexity per function */
  maxCyclomaticPerFunction: 15,
  /** Maximum nesting depth per function */
  maxNestingDepth: 5,
  /** Maximum parameters per function */
  maxParameters: 5,
  /** Maximum functions per file */
  maxFunctionsPerFile: 30,
  /** File-level aggregate cyclomatic complexity */
  maxCyclomaticPerFile: 50
};
var BRANCH_NODES = /* @__PURE__ */ new Set([
  "IfStatement",
  "ConditionalExpression",
  "SwitchCase",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "CatchClause"
]);
var LOGICAL_OPERATORS = /* @__PURE__ */ new Set([
  "&&",
  "||",
  "??"
]);
var FUNCTION_NODES = /* @__PURE__ */ new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "MethodDefinition"
]);
var ComplexityAnalyzer = class {
  static {
    __name(this, "ComplexityAnalyzer");
  }
  id = "complexity";
  name = "Complexity Analysis";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let totalNodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) {
        continue;
      }
      filesAnalyzed++;
      const fileComplexity = this.analyzeFile(content, file);
      if (!fileComplexity) {
        parseErrors.push(`${file}: Failed to parse`);
        continue;
      }
      totalNodesVisited += fileComplexity.functions.length;
      for (const fn of fileComplexity.functions) {
        if (fn.cyclomatic > THRESHOLDS.maxCyclomaticPerFunction) {
          issues.push({
            id: `complexity/cyclomatic/${file}/${fn.line}`,
            severity: fn.cyclomatic > THRESHOLDS.maxCyclomaticPerFunction * 2 ? "high" : "medium",
            type: "HIGH_CYCLOMATIC_COMPLEXITY",
            message: `Function "${fn.name}" has cyclomatic complexity ${fn.cyclomatic} (max: ${THRESHOLDS.maxCyclomaticPerFunction})`,
            file,
            line: fn.line,
            fix: "Extract helper functions or simplify branching logic"
          });
        }
        if (fn.maxNesting > THRESHOLDS.maxNestingDepth) {
          issues.push({
            id: `complexity/nesting/${file}/${fn.line}`,
            severity: "medium",
            type: "DEEP_NESTING",
            message: `Function "${fn.name}" has nesting depth ${fn.maxNesting} (max: ${THRESHOLDS.maxNestingDepth})`,
            file,
            line: fn.line,
            fix: "Use early returns or extract nested logic into helper functions"
          });
        }
        if (fn.parameters > THRESHOLDS.maxParameters) {
          issues.push({
            id: `complexity/parameters/${file}/${fn.line}`,
            severity: "low",
            type: "TOO_MANY_PARAMETERS",
            message: `Function "${fn.name}" has ${fn.parameters} parameters (max: ${THRESHOLDS.maxParameters})`,
            file,
            line: fn.line,
            fix: "Use an options object pattern to reduce parameter count"
          });
        }
      }
      if (fileComplexity.functionCount > THRESHOLDS.maxFunctionsPerFile) {
        issues.push({
          id: `complexity/function-count/${file}`,
          severity: "low",
          type: "TOO_MANY_FUNCTIONS",
          message: `${file} has ${fileComplexity.functionCount} functions (max: ${THRESHOLDS.maxFunctionsPerFile})`,
          file,
          fix: "Split into multiple focused modules"
        });
      }
      if (fileComplexity.totalCyclomatic > THRESHOLDS.maxCyclomaticPerFile) {
        issues.push({
          id: `complexity/file-complexity/${file}`,
          severity: "medium",
          type: "HIGH_FILE_COMPLEXITY",
          message: `${file} has total cyclomatic complexity ${fileComplexity.totalCyclomatic} (max: ${THRESHOLDS.maxCyclomaticPerFile})`,
          file,
          fix: "Consider splitting this file into smaller modules"
        });
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited: totalNodesVisited,
        patternsChecked: [
          "HIGH_CYCLOMATIC_COMPLEXITY",
          "DEEP_NESTING",
          "TOO_MANY_PARAMETERS",
          "TOO_MANY_FUNCTIONS",
          "HIGH_FILE_COMPLEXITY"
        ],
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  /**
   * Analyze a single file and return complexity metrics.
   * Useful for external callers that just want metrics, not issues.
   */
  analyzeFile(content, filePath) {
    if (!isSupportedFile(filePath)) {
      return null;
    }
    const { program, success } = parseSource(content, filePath);
    if (!success && program.body.length === 0) {
      return null;
    }
    const functions = [];
    let fileMaxNesting = 0;
    walkAST(program, (node) => {
      if (!FUNCTION_NODES.has(node.type)) {
        return;
      }
      const fn = this.analyzeFunctionNode(node);
      functions.push(fn);
      if (fn.maxNesting > fileMaxNesting) {
        fileMaxNesting = fn.maxNesting;
      }
    });
    const totalCyclomatic = functions.reduce((sum, fn) => sum + fn.cyclomatic, 0);
    return {
      filePath,
      functions,
      totalCyclomatic,
      maxNesting: fileMaxNesting,
      functionCount: functions.length,
      averageCyclomatic: functions.length > 0 ? totalCyclomatic / functions.length : 0
    };
  }
  // -----------------------------------------------------------------------
  // Per-function analysis
  // -----------------------------------------------------------------------
  analyzeFunctionNode(node) {
    const name = this.getFunctionName(node);
    const line = node.start ?? 0;
    const params = this.getParameterCount(node);
    let cyclomatic = 1;
    let maxNesting = 0;
    const body = this.getFunctionBody(node);
    if (body) {
      this.walkForComplexity(body, (n, depth) => {
        if (BRANCH_NODES.has(n.type)) {
          cyclomatic++;
        }
        if (n.type === "LogicalExpression") {
          const operator = n.operator;
          if (LOGICAL_OPERATORS.has(operator)) {
            cyclomatic++;
          }
        }
        if (depth > maxNesting) {
          maxNesting = depth;
        }
      });
    }
    return {
      name,
      line,
      cyclomatic,
      maxNesting,
      parameters: params
    };
  }
  /**
   * Walk AST nodes counting nesting depth for complexity metrics
   */
  walkForComplexity(node, callback, depth = 0) {
    if (!node || typeof node !== "object") {
      return;
    }
    const n = node;
    if (typeof n.type !== "string") {
      return;
    }
    const nestingNodes = /* @__PURE__ */ new Set([
      "IfStatement",
      "ForStatement",
      "ForInStatement",
      "ForOfStatement",
      "WhileStatement",
      "DoWhileStatement",
      "SwitchStatement",
      "TryStatement"
    ]);
    const newDepth = nestingNodes.has(n.type) ? depth + 1 : depth;
    callback(n, newDepth);
    for (const key of Object.keys(n)) {
      if (key === "type" || key === "start" || key === "end" || key === "loc") {
        continue;
      }
      const value = n[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          this.walkForComplexity(item, callback, newDepth);
        }
      } else if (value && typeof value === "object" && typeof value.type === "string") {
        this.walkForComplexity(value, callback, newDepth);
      }
    }
  }
  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  getFunctionName(node) {
    if (node.id && typeof node.id === "object") {
      const id = node.id;
      if (typeof id.name === "string") {
        return id.name;
      }
    }
    if (node.key && typeof node.key === "object") {
      const key = node.key;
      if (typeof key.name === "string") {
        return key.name;
      }
      if (typeof key.value === "string") {
        return key.value;
      }
    }
    return "<anonymous>";
  }
  getParameterCount(node) {
    if (node.type === "MethodDefinition") {
      const value = node.value;
      if (value && Array.isArray(value.params)) {
        return value.params.length;
      }
    }
    if (Array.isArray(node.params)) {
      return node.params.length;
    }
    return 0;
  }
  getFunctionBody(node) {
    if (node.type === "MethodDefinition") {
      const value = node.value;
      if (value?.body) {
        return value.body;
      }
    }
    if (node.body) {
      return node.body;
    }
    return null;
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx",
      "mts",
      "cts"
    ].includes(ext ?? "");
  }
};

// ../../packages/core/dist/analysis/ast/import-extractor.js
function extractImports(content, filePath) {
  if (!isSupportedFile(filePath)) {
    return {
      filePath,
      imports: [],
      parseSuccess: false,
      parseErrors: [
        `Unsupported file type: ${filePath}`
      ]
    };
  }
  const { program, errors, success } = parseSource(content, filePath);
  const imports = [];
  walkAST(program, (node) => {
    switch (node.type) {
      // import ... from 'source'
      case "ImportDeclaration":
        handleImportDeclaration(node, imports);
        break;
      // export { ... } from 'source'  OR  export * from 'source'
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration":
        handleExportDeclaration(node, imports);
        break;
      // import('source')  -  ESTree ImportExpression
      case "ImportExpression":
        handleImportExpression(node, imports);
        break;
      // require('source')  OR  legacy import('source') as CallExpression
      case "CallExpression":
        handleCallExpression(node, imports);
        break;
    }
  });
  return {
    filePath,
    imports,
    parseSuccess: success,
    parseErrors: errors.map((e) => e.message)
  };
}
__name(extractImports, "extractImports");
function extractImportSources(content, filePath) {
  const result = extractImports(content, filePath);
  const sources = /* @__PURE__ */ new Set();
  for (const imp of result.imports) {
    sources.add(imp.source);
  }
  return [
    ...sources
  ];
}
__name(extractImportSources, "extractImportSources");
function extractImportsBatch(files) {
  const results = /* @__PURE__ */ new Map();
  for (const [filePath, content] of files) {
    results.set(filePath, extractImports(content, filePath));
  }
  return results;
}
__name(extractImportsBatch, "extractImportsBatch");
function handleImportDeclaration(node, imports) {
  const source = getStringValue(node.source);
  if (!source) {
    return;
  }
  const specifiers = [];
  if (Array.isArray(node.specifiers)) {
    for (const spec of node.specifiers) {
      const s = spec;
      if (s.type === "ImportSpecifier") {
        const imported = s.imported;
        specifiers.push(getIdentifierName(imported) ?? "unknown");
      } else if (s.type === "ImportDefaultSpecifier") {
        specifiers.push("default");
      } else if (s.type === "ImportNamespaceSpecifier") {
        specifiers.push("*");
      }
    }
  }
  imports.push({
    source,
    kind: "static",
    typeOnly: node.importKind === "type" || Boolean(node.isTypeOnly),
    line: node.start != null ? node.start : void 0,
    specifiers
  });
}
__name(handleImportDeclaration, "handleImportDeclaration");
function handleExportDeclaration(node, imports) {
  const source = getStringValue(node.source);
  if (!source) {
    return;
  }
  const specifiers = [];
  if (node.type === "ExportAllDeclaration") {
    specifiers.push("*");
  } else if (Array.isArray(node.specifiers)) {
    for (const spec of node.specifiers) {
      const s = spec;
      const local = s.local;
      specifiers.push(getIdentifierName(local) ?? "unknown");
    }
  }
  imports.push({
    source,
    kind: "re-export",
    typeOnly: node.exportKind === "type" || Boolean(node.isTypeOnly),
    line: node.start != null ? node.start : void 0,
    specifiers
  });
}
__name(handleExportDeclaration, "handleExportDeclaration");
function handleImportExpression(node, imports) {
  const source = getStringValue(node.source);
  if (source) {
    imports.push({
      source,
      kind: "dynamic",
      typeOnly: false,
      line: node.start != null ? node.start : void 0,
      specifiers: []
    });
  }
}
__name(handleImportExpression, "handleImportExpression");
function handleCallExpression(node, imports) {
  const callee = node.callee;
  if (!callee) {
    return;
  }
  if (node.type === "CallExpression" && callee.type === "Import") {
    const args = node.arguments;
    if (args && args.length > 0) {
      const source = getStringValue(args[0]);
      if (source) {
        imports.push({
          source,
          kind: "dynamic",
          typeOnly: false,
          line: node.start != null ? node.start : void 0,
          specifiers: []
        });
      }
    }
    return;
  }
  if (callee.type === "Identifier" && callee.name === "require") {
    const args = node.arguments;
    if (args && args.length > 0) {
      const source = getStringValue(args[0]);
      if (source) {
        imports.push({
          source,
          kind: "require",
          typeOnly: false,
          line: node.start != null ? node.start : void 0,
          specifiers: []
        });
      }
    }
  }
}
__name(handleCallExpression, "handleCallExpression");
function getStringValue(node) {
  if (!node || typeof node !== "object") {
    return void 0;
  }
  const n = node;
  if (n.type === "StringLiteral" || n.type === "Literal") {
    return typeof n.value === "string" ? n.value : void 0;
  }
  return void 0;
}
__name(getStringValue, "getStringValue");
function getIdentifierName(node) {
  if (!node || typeof node !== "object") {
    return void 0;
  }
  const n = node;
  if (n.type === "Identifier" || n.type === "IdentifierName" || n.type === "IdentifierReference") {
    return typeof n.name === "string" ? n.name : void 0;
  }
  return void 0;
}
__name(getIdentifierName, "getIdentifierName");

// ../../packages/core/dist/analysis/ast/ImportGraphAnalyzer.js
var THRESHOLDS2 = {
  /** Max files that can import a single file before it's flagged as high fan-in */
  highFanIn: 15,
  /** Max imports a single file can have before it's flagged as high fan-out */
  highFanOut: 20,
  /** Minimum cycle length to report (avoids noise from self-imports) */
  minCycleLength: 2
};
var ImportGraphAnalyzer = class {
  static {
    __name(this, "ImportGraphAnalyzer");
  }
  id = "import-graph";
  name = "Import Graph Analysis";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    const parseErrors = [];
    const extractions = /* @__PURE__ */ new Map();
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) {
        continue;
      }
      filesAnalyzed++;
      const result = extractImports(content, file);
      extractions.set(file, result);
      if (!result.parseSuccess) {
        parseErrors.push(...result.parseErrors);
      }
    }
    const graph = this.buildGraph(extractions, context.workspaceRoot);
    const cycles = this.detectCycles(graph.edges);
    graph.cycles = cycles;
    for (const cycle of cycles) {
      issues.push({
        id: `import-graph/circular/${cycle.join("->")}`,
        severity: "high",
        type: "CIRCULAR_DEPENDENCY",
        message: `Circular dependency: ${cycle.join(" \u2192 ")}`,
        file: cycle[0],
        fix: "Break the cycle by extracting shared code or using dependency injection"
      });
    }
    for (const [file, node] of graph.nodes) {
      if (node.importedBy.length > THRESHOLDS2.highFanIn) {
        issues.push({
          id: `import-graph/high-fan-in/${file}`,
          severity: "medium",
          type: "HIGH_FAN_IN",
          message: `${file} is imported by ${node.importedBy.length} files  -  changes here have high blast radius`,
          file,
          fix: "Consider splitting into smaller, more focused modules"
        });
      }
    }
    for (const [file, node] of graph.nodes) {
      const runtimeImports = node.imports.filter((imp) => !node.typeOnlyImports.includes(imp));
      if (runtimeImports.length > THRESHOLDS2.highFanOut) {
        issues.push({
          id: `import-graph/high-fan-out/${file}`,
          severity: "low",
          type: "HIGH_FAN_OUT",
          message: `${file} imports ${runtimeImports.length} modules  -  high coupling`,
          file,
          fix: "Consider using a facade or consolidating related imports"
        });
      }
    }
    for (const [file, node] of graph.nodes) {
      if (node.importedBy.length === 0 && !this.isEntryPoint(file)) {
        issues.push({
          id: `import-graph/orphan/${file}`,
          severity: "info",
          type: "ORPHAN_FILE",
          message: `${file} is not imported by any other analyzed file`,
          file,
          fix: "Verify this file is needed  -  it may be dead code"
        });
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited: graph.nodes.size,
        patternsChecked: [
          "CIRCULAR_DEPENDENCY",
          "HIGH_FAN_IN",
          "HIGH_FAN_OUT",
          "ORPHAN_FILE"
        ],
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  /**
   * Build the import graph and return it for external consumption.
   * Useful for other tools (momentum scoring, risk propagation, etc.).
   */
  buildGraphFromContext(context) {
    const extractions = /* @__PURE__ */ new Map();
    for (const [file, content] of context.contents) {
      if (this.shouldAnalyzeFile(file)) {
        extractions.set(file, extractImports(content, file));
      }
    }
    const graph = this.buildGraph(extractions, context.workspaceRoot);
    graph.cycles = this.detectCycles(graph.edges);
    return graph;
  }
  // -----------------------------------------------------------------------
  // Graph construction
  // -----------------------------------------------------------------------
  buildGraph(extractions, workspaceRoot) {
    const nodes = /* @__PURE__ */ new Map();
    const edges = /* @__PURE__ */ new Map();
    const reverseEdges = /* @__PURE__ */ new Map();
    for (const filePath of extractions.keys()) {
      const normalized = this.normalizePath(filePath);
      nodes.set(normalized, {
        filePath: normalized,
        imports: [],
        importedBy: [],
        typeOnlyImports: []
      });
      edges.set(normalized, /* @__PURE__ */ new Set());
    }
    for (const [filePath, extraction] of extractions) {
      const normalized = this.normalizePath(filePath);
      for (const imp of extraction.imports) {
        const resolved = this.resolveImport(imp.source, filePath, workspaceRoot);
        if (!resolved) {
          continue;
        }
        const resolvedNorm = this.normalizePath(resolved);
        edges.get(normalized)?.add(resolvedNorm);
        const node = nodes.get(normalized);
        if (node && !node.imports.includes(resolvedNorm)) {
          node.imports.push(resolvedNorm);
          if (imp.typeOnly) {
            node.typeOnlyImports.push(resolvedNorm);
          }
        }
        if (!reverseEdges.has(resolvedNorm)) {
          reverseEdges.set(resolvedNorm, /* @__PURE__ */ new Set());
        }
        reverseEdges.get(resolvedNorm)?.add(normalized);
        if (!nodes.has(resolvedNorm)) {
          nodes.set(resolvedNorm, {
            filePath: resolvedNorm,
            imports: [],
            importedBy: [],
            typeOnlyImports: []
          });
        }
      }
    }
    for (const [file, importers] of reverseEdges) {
      const node = nodes.get(file);
      if (node) {
        node.importedBy = [
          ...importers
        ];
      }
    }
    return {
      nodes,
      edges,
      reverseEdges,
      cycles: []
    };
  }
  // -----------------------------------------------------------------------
  // Cycle detection (Tarjan's SCC adapted for cycles)
  // -----------------------------------------------------------------------
  detectCycles(edges) {
    const cycles = [];
    const visited = /* @__PURE__ */ new Set();
    const inStack = /* @__PURE__ */ new Set();
    const stack = [];
    const dfs = /* @__PURE__ */ __name((node) => {
      if (inStack.has(node)) {
        const cycleStart = stack.indexOf(node);
        if (cycleStart >= 0) {
          const cycle = stack.slice(cycleStart);
          if (cycle.length >= THRESHOLDS2.minCycleLength) {
            cycles.push([
              ...cycle,
              node
            ]);
          }
        }
        return;
      }
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      inStack.add(node);
      stack.push(node);
      const neighbors = edges.get(node) ?? /* @__PURE__ */ new Set();
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }
      stack.pop();
      inStack.delete(node);
    }, "dfs");
    for (const node of edges.keys()) {
      dfs(node);
    }
    return cycles;
  }
  // -----------------------------------------------------------------------
  // Import resolution
  // -----------------------------------------------------------------------
  resolveImport(importSource, fromFile, _workspaceRoot) {
    if (!importSource.startsWith(".") && !importSource.startsWith("/")) {
      if (importSource.startsWith("@")) {
        const parts = importSource.split("/");
        if (parts.length >= 2) {
          const pkg = parts[1];
          return `packages/${pkg}/src/index.ts`;
        }
      }
      return null;
    }
    const fromDir = dirname(fromFile);
    let resolved = resolve(fromDir, importSource);
    if (!resolved.match(/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/)) {
      resolved += ".ts";
    }
    resolved = resolved.replace(/\.js$/, ".ts").replace(/\.jsx$/, ".tsx");
    return resolved;
  }
  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx",
      "mts",
      "cts"
    ].includes(ext ?? "");
  }
  isEntryPoint(file) {
    return file.includes("index.") || file.includes("main.") || file.includes("entry.") || file.includes("server.") || file.includes("app.") || file.endsWith("/page.tsx") || file.endsWith("/layout.tsx") || file.endsWith("/route.ts") || file.includes("__tests__") || file.includes(".test.") || file.includes(".spec.");
  }
  normalizePath(filePath) {
    return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  }
};
var SyntaxAnalyzer = class {
  static {
    __name(this, "SyntaxAnalyzer");
  }
  id = "syntax";
  name = "Syntax Analysis";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) {
        continue;
      }
      filesAnalyzed++;
      try {
        const ast = eslintParser.parse(content, {
          sourceType: "module",
          ecmaFeatures: {
            jsx: file.endsWith(".tsx") || file.endsWith(".jsx")
          },
          ecmaVersion: "latest",
          // Error recovery mode to get partial AST even with errors
          errorOnUnknownASTType: false
        });
        nodesVisited += this.countNodes(ast);
        this.checkSyntaxPatterns(content, file, issues);
      } catch (error) {
        const parseError = this.extractParseError(error);
        parseErrors.push(`${file}: ${parseError.message}`);
        issues.push({
          id: `syntax/parse-error/${file}/${parseError.line}`,
          severity: "critical",
          type: "SYNTAX_ERROR",
          message: parseError.message,
          file,
          line: parseError.line,
          column: parseError.column,
          fix: "Fix the syntax error to allow parsing"
        });
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited,
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx"
    ].includes(ext || "");
  }
  /**
   * Extract parse error information from parser exception
   */
  extractParseError(error) {
    if (error instanceof Error) {
      const match = error.message.match(/\((\d+):(\d+)\)/);
      if (match) {
        return {
          message: error.message,
          line: Number.parseInt(match[1], 10),
          column: Number.parseInt(match[2], 10)
        };
      }
      return {
        message: error.message,
        line: 1,
        column: 1
      };
    }
    return {
      message: String(error),
      line: 1,
      column: 1
    };
  }
  /**
   * Count AST nodes for coverage metrics
   */
  countNodes(node) {
    if (!node || typeof node !== "object") {
      return 0;
    }
    let count = 1;
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          count += this.countNodes(item);
        }
      } else if (value && typeof value === "object" && "type" in value) {
        count += this.countNodes(value);
      }
    }
    return count;
  }
  /**
   * Check for additional syntax patterns that may indicate issues
   */
  checkSyntaxPatterns(content, file, issues) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      if (line.includes(";;")) {
        issues.push({
          id: `syntax/double-semicolon/${file}/${lineNum}`,
          severity: "low",
          type: "SYNTAX_WARNING",
          message: "Double semicolon detected",
          file,
          line: lineNum,
          column: line.indexOf(";;") + 1,
          fix: "Remove extra semicolon",
          snippet: line.trim()
        });
      }
      if (/console\.assert\([^,]+,\s*\)/.test(line)) {
        issues.push({
          id: `syntax/empty-assert/${file}/${lineNum}`,
          severity: "medium",
          type: "SYNTAX_WARNING",
          message: "console.assert with empty message",
          file,
          line: lineNum,
          fix: "Add assertion message for debugging",
          snippet: line.trim()
        });
      }
      if (/if\s*\([^=]*=\s*[^=]/.test(line) && !/if\s*\([^=]*[=!]==/.test(line)) {
        const assignMatch = line.match(/if\s*\(\s*(\w+)\s*=\s*[^=]/);
        if (assignMatch) {
          issues.push({
            id: `syntax/assignment-in-condition/${file}/${lineNum}`,
            severity: "medium",
            type: "SYNTAX_WARNING",
            message: "Possible assignment in condition (did you mean ===?)",
            file,
            line: lineNum,
            fix: "Use === for comparison, or wrap in extra parentheses if intentional",
            snippet: line.trim()
          });
        }
      }
    }
  }
};
var CompletenessAnalyzer = class {
  static {
    __name(this, "CompletenessAnalyzer");
  }
  id = "completeness";
  name = "Completeness Detection";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  todoPatterns = [
    /\/\/\s*TODO\b/gi,
    /\/\/\s*FIXME\b/gi,
    /\/\/\s*XXX\b/gi,
    /\/\/\s*HACK\b/gi,
    /\/\*\s*TODO\b/gi,
    /\/\*\s*FIXME\b/gi
  ];
  placeholderPatterns = [
    /throw\s+new\s+Error\s*\(\s*['"`].*not\s*implemented.*['"`]\s*\)/gi,
    /throw\s+new\s+Error\s*\(\s*['"`]TODO.*['"`]\s*\)/gi,
    /NotImplementedError/gi,
    /throw\s+new\s+Error\s*\(\s*['"`]STUB['"`]\s*\)/gi
  ];
  parserOptions = {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx"
    ],
    errorRecovery: true
  };
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) {
        continue;
      }
      filesAnalyzed++;
      this.checkTodoComments(content, file, issues);
      this.checkPlaceholderPatterns(content, file, issues);
      try {
        const ast = parse(content, {
          ...this.parserOptions,
          plugins: this.getPluginsForFile(file)
        });
        const result = this.analyzeAST(ast, content, file);
        issues.push(...result.issues);
        nodesVisited += result.nodesVisited;
      } catch (error) {
        parseErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited,
        patternsChecked: [
          "TODO",
          "FIXME",
          "EMPTY_CATCH",
          "EMPTY_FUNCTION",
          "NOT_IMPLEMENTED",
          "PLACEHOLDER"
        ],
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx"
    ].includes(ext || "");
  }
  getPluginsForFile(file) {
    const plugins = [
      "typescript"
    ];
    if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      plugins.push("jsx");
    }
    return plugins;
  }
  /**
   * Check for TODO/FIXME comments // Issue: LIN-0000
   */
  checkTodoComments(content, file, issues) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      for (const pattern of this.todoPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          const todoContent = line.trim().slice(0, 100);
          issues.push({
            id: `completeness/todo/${file}/${lineNum}`,
            severity: "medium",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: `TODO/FIXME: ${todoContent}`,
            file,
            line: lineNum,
            snippet: todoContent
          });
          break;
        }
      }
    }
  }
  /**
   * Check for placeholder/stub patterns
   */
  checkPlaceholderPatterns(content, file, issues) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      for (const pattern of this.placeholderPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          issues.push({
            id: `completeness/placeholder/${file}/${lineNum}`,
            severity: "high",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: 'Placeholder implementation: "not implemented" or similar',
            file,
            line: lineNum,
            fix: "Implement the functionality or remove the placeholder",
            snippet: line.trim().slice(0, 100)
          });
          break;
        }
      }
    }
  }
  /**
   * AST-based detection of empty/incomplete code
   */
  analyzeAST(ast, _content, file) {
    const issues = [];
    let nodesVisited = 0;
    traverse(ast, {
      enter() {
        nodesVisited++;
      },
      // Empty catch blocks
      CatchClause: /* @__PURE__ */ __name((path) => {
        const body = path.node.body;
        if (body.body.length === 0) {
          issues.push({
            id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
            severity: "medium",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: "Empty catch block - errors silently swallowed",
            file,
            line: path.node.loc?.start.line,
            fix: "Add error handling, rethrow, or log the error"
          });
        } else if (body.body.length === 1) {
          const stmt = body.body[0];
          if (stmt.type === "EmptyStatement") {
            issues.push({
              id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
              severity: "medium",
              type: "INCOMPLETE_IMPLEMENTATION",
              message: "Catch block contains only empty statement",
              file,
              line: path.node.loc?.start.line,
              fix: "Add proper error handling"
            });
          }
        }
      }, "CatchClause"),
      // Empty function bodies (excluding type declarations and interface methods)
      FunctionDeclaration: /* @__PURE__ */ __name((path) => {
        if (path.node.body.body.length === 0) {
          const funcName = path.node.id?.name || "anonymous";
          {
            issues.push({
              id: `completeness/empty-fn/${file}/${path.node.loc?.start.line}`,
              severity: "medium",
              type: "INCOMPLETE_IMPLEMENTATION",
              message: `Empty function body: ${funcName}()`,
              file,
              line: path.node.loc?.start.line,
              fix: "Implement the function or mark as abstract/stub if intentional"
            });
          }
        }
      }, "FunctionDeclaration"),
      // Empty method bodies
      ClassMethod: /* @__PURE__ */ __name((path) => {
        if (path.node.abstract) {
          return;
        }
        if (path.node.kind === "get" || path.node.kind === "set") {
          return;
        }
        const body = path.node.body;
        if (body && body.body.length === 0) {
          const methodName = path.node.key.type === "Identifier" ? path.node.key.name : "anonymous";
          if (methodName === "constructor") {
            return;
          }
          issues.push({
            id: `completeness/empty-method/${file}/${path.node.loc?.start.line}`,
            severity: "medium",
            type: "INCOMPLETE_IMPLEMENTATION",
            message: `Empty method body: ${methodName}()`,
            file,
            line: path.node.loc?.start.line,
            fix: "Implement the method or mark as abstract if intentional"
          });
        }
      }, "ClassMethod"),
      // Arrow functions that just throw or are empty (might be intentional)
      ArrowFunctionExpression: /* @__PURE__ */ __name((path) => {
        const body = path.node.body;
        if (body.type === "BlockStatement" && body.body.length === 0) {
          const parent = path.parent;
          if (parent.type === "VariableDeclarator") {
            const varName = parent.id.type === "Identifier" ? parent.id.name : "anonymous";
            issues.push({
              id: `completeness/empty-arrow/${file}/${path.node.loc?.start.line}`,
              severity: "low",
              type: "INCOMPLETE_IMPLEMENTATION",
              message: `Empty arrow function: ${varName}`,
              file,
              line: path.node.loc?.start.line,
              fix: "Implement the function or use () => { /* intentionally empty */ } if intentionally empty"
            });
          }
        }
      }, "ArrowFunctionExpression"),
      // Check for structured-log that might be debug code
      CallExpression: /* @__PURE__ */ __name((path) => {
        const callee = path.node.callee;
        if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "console" && callee.property.type === "Identifier" && callee.property.name === "log") {
          const firstArg = path.node.arguments[0];
          if (firstArg && firstArg.type === "StringLiteral") {
            const msg = firstArg.value.toLowerCase();
            if (msg.includes("debug") || msg.includes("test") || msg.includes("todo") || msg.includes("remove")) {
              issues.push({
                id: `completeness/debug-log/${file}/${path.node.loc?.start.line}`,
                severity: "low",
                type: "DEBUG_CODE",
                message: `Debug process.stdout.write left in code: "${firstArg.value.slice(0, 50)}"`,
                file,
                line: path.node.loc?.start.line,
                fix: "Remove debug logging before commit"
              });
            }
          }
        }
      }, "CallExpression")
    });
    return {
      issues,
      nodesVisited
    };
  }
};
var EXPORT_PATTERNS = [
  /export\s+(const|function|class|interface|type|enum)\s+(\w+)/g,
  /export\s+default\s+(function|class)?\s*(\w+)?/g,
  /export\s+\{([^}]+)\}/g
];
var PERFORMANCE_PATTERNS = [
  {
    pattern: /\.forEach\s*\(/g,
    type: "computation",
    risk: "low"
  },
  {
    pattern: /for\s*\(\s*let\s+\w+\s*=\s*0/g,
    type: "computation",
    risk: "low"
  },
  {
    pattern: /while\s*\(/g,
    type: "computation",
    risk: "medium"
  },
  {
    pattern: /async\s+function|await\s+/g,
    type: "io",
    risk: "medium"
  },
  {
    pattern: /new\s+(Map|Set|Array)\s*\(/g,
    type: "memory",
    risk: "low"
  },
  {
    pattern: /JSON\.(parse|stringify)/g,
    type: "computation",
    risk: "medium"
  },
  {
    pattern: /readFileSync|writeFileSync/g,
    type: "io",
    risk: "high"
  },
  {
    pattern: /spawn|exec\s*\(/g,
    type: "io",
    risk: "high"
  },
  {
    pattern: /import\s*\(/g,
    type: "bundle",
    risk: "low"
  },
  {
    pattern: /require\s*\(/g,
    type: "bundle",
    risk: "medium"
  }
];
var TEST_FILE_PATTERNS = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//
];
var ChangeImpactAnalyzer = class {
  static {
    __name(this, "ChangeImpactAnalyzer");
  }
  id = "change-impact";
  name = "Change Impact Analyzer";
  filePatterns = [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx"
  ];
  workspaceRoot;
  dependencyGraph = /* @__PURE__ */ new Map();
  reverseDependencyGraph = /* @__PURE__ */ new Map();
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Check if this analyzer should run
   */
  shouldRun(context) {
    return context.files.some((f) => this.filePatterns.some((p) => new RegExp(p.replace(/\*/g, ".*")).test(f)));
  }
  /**
   * Run impact analysis
   */
  async analyze(context) {
    const start = Date.now();
    const issues = [];
    try {
      await this.buildDependencyGraph(context);
      for (const file of context.files) {
        const content = context.contents.get(file);
        if (!content) {
          continue;
        }
        const breakingChanges = this.detectBreakingChanges(content, file);
        for (const bc of breakingChanges) {
          issues.push({
            id: `impact/breaking/${bc.type}/${file}/${bc.symbol}`,
            severity: bc.severity,
            type: `BREAKING_${bc.type.toUpperCase()}`,
            message: bc.description,
            file,
            fix: bc.migration
          });
        }
        const perfImpacts = this.detectPerformanceImpacts(content, file);
        for (const pi of perfImpacts) {
          if (pi.risk === "high" || pi.risk === "critical") {
            issues.push({
              id: `impact/perf/${pi.type}/${file}/${pi.component}`,
              severity: pi.risk === "critical" ? "critical" : "high",
              type: `PERF_${pi.type.toUpperCase()}`,
              message: pi.description,
              file,
              fix: pi.recommendation
            });
          }
        }
        const affectedTests = this.findAffectedTests(file);
        if (affectedTests.length > 5) {
          issues.push({
            id: `impact/tests/${file}`,
            severity: "medium",
            type: "HIGH_TEST_IMPACT",
            message: `Change affects ${affectedTests.length} test files - consider running full test suite`,
            file
          });
        }
      }
      return {
        analyzer: this.id,
        success: true,
        issues,
        coverage: 1,
        duration: Date.now() - start,
        metadata: {
          filesAnalyzed: context.files.length
        }
      };
    } catch (error) {
      return {
        analyzer: this.id,
        success: false,
        issues: [
          {
            id: "impact/error",
            severity: "high",
            type: "ANALYSIS_ERROR",
            message: error instanceof Error ? error.message : String(error)
          }
        ],
        coverage: 0,
        duration: Date.now() - start
      };
    }
  }
  /**
   * Get full impact analysis (more detailed than standard analyze)
   */
  async getFullImpact(files, contents) {
    const start = Date.now();
    const context = {
      workspaceRoot: this.workspaceRoot,
      files,
      contents
    };
    await this.buildDependencyGraph(context);
    const affectedTests = [];
    const breakingChanges = [];
    const performanceImpacts = [];
    const dependentFiles = [];
    const recommendations = [];
    for (const file of files) {
      const content = contents.get(file) || "";
      const tests = this.findAffectedTests(file);
      affectedTests.push(...tests);
      const breaks = this.detectBreakingChanges(content, file);
      breakingChanges.push(...breaks);
      const perfs = this.detectPerformanceImpacts(content, file);
      performanceImpacts.push(...perfs);
      const deps = this.findDependentFiles(file);
      dependentFiles.push(...deps);
    }
    const impactScore = this.calculateImpactScore(affectedTests, breakingChanges, performanceImpacts, dependentFiles);
    if (breakingChanges.length > 0) {
      recommendations.push(`\u26A0\uFE0F ${breakingChanges.length} breaking change(s) detected - update dependent code`);
    }
    if (affectedTests.length > 10) {
      recommendations.push(`\u{1F9EA} Run full test suite - ${affectedTests.length} tests potentially affected`);
    }
    if (performanceImpacts.some((p) => p.risk === "high" || p.risk === "critical")) {
      recommendations.push("\u26A1 Performance-sensitive code modified - run benchmarks");
    }
    if (dependentFiles.length > 20) {
      recommendations.push("\u{1F517} High ripple effect - consider incremental rollout");
    }
    return {
      filesAnalyzed: files.length,
      affectedTests: this.dedupeItems(affectedTests),
      breakingChanges,
      performanceImpacts,
      dependentFiles: this.dedupeItems(dependentFiles),
      impactScore,
      recommendations,
      duration: Date.now() - start
    };
  }
  // =========================================================================
  // Private Methods
  // =========================================================================
  /**
   * Build dependency graph from file contents
   */
  async buildDependencyGraph(context) {
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
    for (const file of context.files) {
      const content = context.contents.get(file);
      if (!content) {
        continue;
      }
      const imports = this.extractImports(content, file);
      this.dependencyGraph.set(file, imports);
      for (const imp of imports) {
        const existing = this.reverseDependencyGraph.get(imp) || [];
        existing.push(file);
        this.reverseDependencyGraph.set(imp, existing);
      }
    }
  }
  /**
   * Extract import statements from file content using AST analysis.
   *
   * UPGRADED (11b): Replaces regex-based import extraction with proper AST walking
   * via packages/core/src/analysis/ast/import-extractor.ts (oxc-parser based).
   * This eliminates false positives from imports in strings/comments and correctly
   * handles dynamic imports, re-exports, and type-only imports.
   */
  extractImports(content, fromFile) {
    const rawSources = extractImportSources(content, fromFile);
    const imports = [];
    for (const source of rawSources) {
      const importPath = this.resolveImportPath(source, fromFile);
      if (importPath) {
        imports.push(importPath);
      }
    }
    return imports;
  }
  /**
   * Resolve import path to absolute file path
   */
  resolveImportPath(importPath, fromFile) {
    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      return null;
    }
    const dir = dirname(fromFile);
    const normalized = `${dir}/${importPath}`.replace(/\/\.\//g, "/");
    if (/\.[cm]?[jt]sx?$/.test(importPath)) {
      return normalized;
    }
    return `${normalized}.ts`;
  }
  /**
   * Find test files that might be affected by a change
   */
  findAffectedTests(file) {
    const tests = [];
    const relPath = relative(this.workspaceRoot, file);
    const fileName = basename(file).replace(/\.[tj]sx?$/, "");
    const directTestPatterns = [
      `${fileName}.test.ts`,
      `${fileName}.test.tsx`,
      `${fileName}.spec.ts`,
      `${fileName}.spec.tsx`,
      `__tests__/${fileName}.test.ts`,
      `__tests__/${fileName}.test.tsx`
    ];
    for (const pattern of directTestPatterns) {
      tests.push({
        path: pattern,
        reason: "Direct test file for changed source",
        level: "high"
      });
    }
    const importers = this.reverseDependencyGraph.get(file) || [];
    for (const importer of importers) {
      if (this.isTestFile(importer)) {
        tests.push({
          path: relative(this.workspaceRoot, importer),
          reason: "Test file imports changed module",
          level: "medium"
        });
      }
    }
    if (relPath.includes("/core/") || relPath.includes("/services/")) {
      tests.push({
        path: "**/*.integration.test.ts",
        reason: "Core module change may affect integration tests",
        level: "low"
      });
    }
    return tests;
  }
  /**
   * Check if a file is a test file
   */
  isTestFile(file) {
    return TEST_FILE_PATTERNS.some((p) => p.test(file));
  }
  /**
   * Detect breaking changes in content
   */
  detectBreakingChanges(content, file) {
    const breaks = [];
    for (const pattern of EXPORT_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match2;
      while ((match2 = regex.exec(content)) !== null) {
        const symbolName = match2[2] || match2[1];
        if (symbolName) {
          breaks.push({
            type: "export",
            symbol: symbolName,
            file,
            description: `Exported symbol '${symbolName}' may have changed`,
            severity: "medium",
            migration: `Verify consumers of '${symbolName}' are updated`
          });
        }
      }
    }
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const body = match[2];
      if (body.includes("?:") || body.includes(": ")) {
        breaks.push({
          type: "type",
          symbol: interfaceName,
          file,
          description: `Interface '${interfaceName}' definition changed`,
          severity: "medium"
        });
      }
    }
    return breaks;
  }
  /**
   * Detect performance-sensitive code changes
   */
  detectPerformanceImpacts(content, file) {
    const impacts = [];
    for (const { pattern, type, risk } of PERFORMANCE_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        impacts.push({
          type,
          description: `${type} operation detected: ${match[0]}`,
          risk,
          component: basename(file),
          recommendation: this.getPerformanceRecommendation(type)
        });
      }
    }
    return impacts;
  }
  /**
   * Get recommendation for performance issue type
   */
  getPerformanceRecommendation(type) {
    switch (type) {
      case "hotpath":
        return "Consider memoization or caching for hot paths";
      case "memory":
        return "Monitor memory usage, consider object pooling";
      case "io":
        return "Use async operations, consider batching";
      case "computation":
        return "Profile for bottlenecks, consider Web Workers";
      case "bundle":
        return "Use dynamic imports for code splitting";
      default:
        return "Profile before optimizing";
    }
  }
  /**
   * Find files that depend on changed file
   */
  findDependentFiles(file) {
    const dependents = [];
    const visited = /* @__PURE__ */ new Set();
    const traverse3 = /* @__PURE__ */ __name((current, depth) => {
      if (visited.has(current) || depth > 3) {
        return;
      }
      visited.add(current);
      const importers = this.reverseDependencyGraph.get(current) || [];
      for (const importer of importers) {
        dependents.push({
          path: relative(this.workspaceRoot, importer),
          reason: depth === 0 ? "Directly imports changed file" : `Transitive dependency (depth ${depth})`,
          level: depth === 0 ? "high" : depth === 1 ? "medium" : "low"
        });
        traverse3(importer, depth + 1);
      }
    }, "traverse");
    traverse3(file, 0);
    return dependents;
  }
  /**
   * Calculate overall impact score
   */
  calculateImpactScore(tests, breaks, perfs, deps) {
    let score = 0;
    score += Math.min(tests.length * 0.05, 0.25);
    score += Math.min(breaks.length * 0.15, 0.35);
    score += Math.min(perfs.filter((p) => p.risk === "high").length * 0.1, 0.2);
    score += Math.min(deps.length * 0.02, 0.2);
    return Math.min(score, 1);
  }
  /**
   * Deduplicate impact items
   */
  dedupeItems(items) {
    const seen = /* @__PURE__ */ new Set();
    return items.filter((item) => {
      if (seen.has(item.path)) {
        return false;
      }
      seen.add(item.path);
      return true;
    });
  }
};
function createChangeImpactAnalyzer(workspaceRoot) {
  return new ChangeImpactAnalyzer(workspaceRoot);
}
__name(createChangeImpactAnalyzer, "createChangeImpactAnalyzer");
var SecurityAnalyzer = class {
  static {
    __name(this, "SecurityAnalyzer");
  }
  id = "security";
  name = "Security Analysis";
  filePatterns = [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx"
  ];
  parserOptions = {
    sourceType: "module",
    plugins: [
      "typescript",
      "jsx"
    ],
    errorRecovery: true
  };
  async analyze(context) {
    const startTime = performance.now();
    const issues = [];
    let filesAnalyzed = 0;
    let nodesVisited = 0;
    const parseErrors = [];
    for (const [file, content] of context.contents) {
      if (!this.shouldAnalyzeFile(file)) {
        continue;
      }
      filesAnalyzed++;
      try {
        const ast = parse(content, {
          ...this.parserOptions,
          plugins: this.getPluginsForFile(file)
        });
        const fileIssues = this.analyzeAST(ast, content, file);
        issues.push(...fileIssues.issues);
        nodesVisited += fileIssues.nodesVisited;
      } catch (error) {
        parseErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
        issues.push({
          id: `security/parse-error/${file}`,
          severity: "info",
          type: "PARSE_ERROR",
          message: `Could not parse for security analysis: ${error instanceof Error ? error.message : String(error)}`,
          file
        });
      }
    }
    return {
      analyzer: this.id,
      success: true,
      issues,
      coverage: filesAnalyzed / Math.max(context.files.length, 1),
      duration: performance.now() - startTime,
      metadata: {
        filesAnalyzed,
        nodesVisited,
        patternsChecked: [
          "UNSAFE_EVAL",
          "PATH_TRAVERSAL",
          "MISSING_SIGNAL_HANDLER",
          "COMMAND_INJECTION",
          "SQL_INJECTION",
          "XSS_RISK",
          "HARDCODED_SECRET",
          "UNSAFE_REGEX"
        ],
        parseErrors
      }
    };
  }
  shouldRun(context) {
    return context.files.some((f) => this.shouldAnalyzeFile(f));
  }
  shouldAnalyzeFile(file) {
    const ext = file.split(".").pop()?.toLowerCase();
    return [
      "ts",
      "tsx",
      "js",
      "jsx"
    ].includes(ext || "");
  }
  getPluginsForFile(file) {
    const plugins = [
      "typescript"
    ];
    if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      plugins.push("jsx");
    }
    return plugins;
  }
  /**
   * Analyze AST for security issues
   */
  analyzeAST(ast, content, file) {
    const issues = [];
    let nodesVisited = 0;
    const fileContext = {
      isDaemon: false,
      hasSignalHandler: false};
    fileContext.isDaemon = content.includes(".listen(") || file.includes("daemon") || file.includes("server") || file.includes("worker");
    traverse(ast, {
      enter() {
        nodesVisited++;
      },
      // Detect eval()
      CallExpression: /* @__PURE__ */ __name((path) => {
        const callee = path.node.callee;
        if (callee.type === "Identifier" && callee.name === "eval") {
          issues.push({
            id: `security/eval/${file}/${path.node.loc?.start.line}`,
            severity: "critical",
            type: "UNSAFE_EVAL",
            message: "eval() allows arbitrary code execution",
            file,
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column,
            fix: "Use JSON.parse() for data or refactor logic to avoid eval"
          });
        }
        if (callee.type === "Identifier" && callee.name === "Function") {
          issues.push({
            id: `security/function-constructor/${file}/${path.node.loc?.start.line}`,
            severity: "critical",
            type: "UNSAFE_EVAL",
            message: "new Function() is equivalent to eval() and allows arbitrary code execution",
            file,
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column,
            fix: "Refactor to avoid dynamic code generation"
          });
        }
        if (callee.type === "Identifier" && (callee.name === "setTimeout" || callee.name === "setInterval")) {
          const firstArg = path.node.arguments[0];
          if (firstArg && firstArg.type === "StringLiteral") {
            issues.push({
              id: `security/string-timer/${file}/${path.node.loc?.start.line}`,
              severity: "high",
              type: "UNSAFE_EVAL",
              message: `${callee.name} with string argument executes code like eval()`,
              file,
              line: path.node.loc?.start.line,
              fix: "Pass a function instead of a string"
            });
          }
        }
        if (callee.type === "Identifier" && (callee.name === "exec" || callee.name === "execSync")) {
          const firstArg = path.node.arguments[0];
          if (firstArg && !this.isStaticString(firstArg)) {
            issues.push({
              id: `security/command-injection/${file}/${path.node.loc?.start.line}`,
              severity: "high",
              type: "COMMAND_INJECTION",
              message: "exec with dynamic command - potential command injection",
              file,
              line: path.node.loc?.start.line,
              fix: "Validate/sanitize input or use execFile with explicit arguments"
            });
          }
        }
        if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "process" && callee.property.type === "Identifier" && callee.property.name === "on") {
          const firstArg = path.node.arguments[0];
          if (firstArg && firstArg.type === "StringLiteral") {
            if (firstArg.value === "SIGTERM" || firstArg.value === "SIGINT") {
              fileContext.hasSignalHandler = true;
            }
          }
        }
      }, "CallExpression"),
      // Detect fs operations with dynamic paths
      MemberExpression: /* @__PURE__ */ __name((path) => {
        const node = path.node;
        if (node.object.type === "Identifier" && (node.object.name === "fs" || node.object.name === "fsp")) {
          const parent = path.parentPath;
          if (parent.isCallExpression()) {
            const methodName = node.property.type === "Identifier" ? node.property.name : node.property.value;
            const pathMethods = [
              "readFile",
              "readFileSync",
              "writeFile",
              "writeFileSync",
              "readdir",
              "readdirSync",
              "stat",
              "statSync",
              "unlink",
              "unlinkSync",
              "mkdir",
              "mkdirSync",
              "rmdir",
              "rmdirSync",
              "access",
              "accessSync"
            ];
            if (pathMethods.includes(methodName)) {
              const firstArg = parent.node.arguments[0];
              if (firstArg && !this.isStaticPath(firstArg)) {
                issues.push({
                  id: `security/path-traversal/${file}/${path.node.loc?.start.line}`,
                  severity: "high",
                  type: "PATH_TRAVERSAL",
                  message: `fs.${methodName} with dynamic path - potential path traversal`,
                  file,
                  line: path.node.loc?.start.line,
                  fix: "Validate paths against workspace root before use"
                });
              }
            }
          }
        }
      }, "MemberExpression"),
      // Check for dangerous regex patterns
      NewExpression: /* @__PURE__ */ __name((path) => {
        if (path.node.callee.type === "Identifier" && path.node.callee.name === "RegExp") {
          const firstArg = path.node.arguments[0];
          if (firstArg && !this.isStaticString(firstArg)) {
            issues.push({
              id: `security/unsafe-regex/${file}/${path.node.loc?.start.line}`,
              severity: "medium",
              type: "UNSAFE_REGEX",
              message: "Dynamic RegExp - potential ReDoS or injection vulnerability",
              file,
              line: path.node.loc?.start.line,
              fix: "Use static regex patterns or validate input"
            });
          }
        }
      }, "NewExpression"),
      // Check for innerHTML/dangerouslySetInnerHTML (XSS)
      JSXAttribute: /* @__PURE__ */ __name((path) => {
        const name = path.node.name;
        if (name.type === "JSXIdentifier" && name.name === "dangerouslySetInnerHTML") {
          issues.push({
            id: `security/xss-risk/${file}/${path.node.loc?.start.line}`,
            severity: "high",
            type: "XSS_RISK",
            message: "dangerouslySetInnerHTML can lead to XSS if content is not sanitized",
            file,
            line: path.node.loc?.start.line,
            fix: "Sanitize HTML content before rendering or avoid using dangerouslySetInnerHTML"
          });
        }
      }, "JSXAttribute"),
      // Check for hardcoded secrets in variable declarations
      VariableDeclarator: /* @__PURE__ */ __name((path) => {
        const id = path.node.id;
        const init = path.node.init;
        if (id.type === "Identifier" && init) {
          this.checkForHardcodedSecret(id.name, init, file, path.node.loc?.start.line, issues);
        }
      }, "VariableDeclarator"),
      // Check for hardcoded secrets in class properties
      ClassProperty: /* @__PURE__ */ __name((path) => {
        const key = path.node.key;
        const value = path.node.value;
        if (key.type === "Identifier" && value) {
          this.checkForHardcodedSecret(key.name, value, file, path.node.loc?.start.line, issues);
        }
      }, "ClassProperty"),
      // After traversal is complete, check daemon-specific patterns
      Program: {
        exit: /* @__PURE__ */ __name(() => {
          if (fileContext.isDaemon && !fileContext.hasSignalHandler) {
            issues.push({
              id: `security/signal-handler/${file}`,
              severity: "high",
              type: "MISSING_SIGNAL_HANDLER",
              message: "Daemon/server missing signal handlers (SIGTERM/SIGINT)",
              file,
              fix: "Add process.on('SIGTERM', gracefulShutdown) for clean shutdown"
            });
          }
        }, "exit")
      }
    });
    return {
      issues,
      nodesVisited
    };
  }
  /**
   * Check if expression is a static string (safe)
   */
  isStaticString(node) {
    if (node.type === "StringLiteral") {
      return true;
    }
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
      return true;
    }
    return false;
  }
  /**
   * Check if expression is a static path (safe)
   */
  isStaticPath(node) {
    if (node.type === "StringLiteral") {
      return true;
    }
    if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
      return true;
    }
    if (node.type === "CallExpression") {
      const callee = node.callee;
      if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "path" && callee.property.type === "Identifier" && callee.property.name === "join") {
        return node.arguments.every((arg) => {
          if (arg.type === "StringLiteral") {
            return true;
          }
          if (arg.type === "Identifier" && (arg.name === "__dirname" || arg.name === "__filename")) {
            return true;
          }
          return false;
        });
      }
    }
    return false;
  }
  /**
   * Check if a value looks like a hardcoded secret
   */
  checkForHardcodedSecret(name, value, file, line, issues) {
    if (!value) {
      return;
    }
    const varName = name.toLowerCase();
    const secretIndicators = [
      "apikey",
      "api_key",
      "secret",
      "password",
      "token",
      "credential",
      "auth",
      "key"
    ];
    if (secretIndicators.some((s) => varName.includes(s))) {
      if (value.type === "StringLiteral" && value.value.length > 8) {
        const valueStr = value.value.toLowerCase();
        if (!valueStr.includes("placeholder") && !valueStr.includes("example") && !valueStr.includes("xxx") && !valueStr.includes("todo") && !valueStr.includes("your_") && !valueStr.includes("env.")) {
          issues.push({
            id: `security/hardcoded-secret/${file}/${line}`,
            severity: "critical",
            type: "HARDCODED_SECRET",
            message: `Possible hardcoded secret in "${name}"`,
            file,
            line,
            fix: "Use environment variables for secrets"
          });
        }
      }
    }
  }
};

// ../../packages/core/dist/analysis/pipeline.js
var ANALYZER_COVERAGE_MAP = {
  syntax: "astParsed",
  security: "securityChecked",
  completeness: "completenessChecked",
  "change-impact": "architectureChecked",
  "import-graph": "importGraphChecked",
  complexity: "complexityChecked"
};
var CONFIDENCE_WEIGHTS = {
  syntax: 0.2,
  security: 0.25,
  completeness: 0.15,
  "change-impact": 0.1,
  "import-graph": 0.15,
  complexity: 0.15
};
async function runAnalysisPipeline(context, config) {
  const start = Date.now();
  const parallel = config?.parallel ?? true;
  const timeout = config?.timeout ?? 3e4;
  const allAnalyzers = createAnalyzers(context.workspaceRoot);
  const selectedAnalyzers = filterAnalyzers(allAnalyzers, context, config?.analyzers);
  const results = parallel ? await runParallel(selectedAnalyzers, context, timeout) : await runSequential(selectedAnalyzers, context, timeout);
  const coverage = buildCoverageInfo(results, context);
  const confidence = calculateConfidence(results, coverage);
  const allIssues = results.flatMap((r) => r.issues);
  const issuesBySeverity = groupBySeverity(allIssues);
  return {
    results,
    totalIssues: allIssues.length,
    issuesBySeverity,
    coverage,
    confidence,
    duration: Date.now() - start
  };
}
__name(runAnalysisPipeline, "runAnalysisPipeline");
function createAnalyzers(workspaceRoot) {
  return [
    new SyntaxAnalyzer(),
    new SecurityAnalyzer(),
    new CompletenessAnalyzer(),
    new ComplexityAnalyzer(),
    new ImportGraphAnalyzer(),
    new ChangeImpactAnalyzer(workspaceRoot)
  ];
}
__name(createAnalyzers, "createAnalyzers");
function filterAnalyzers(analyzers, context, selectedIds) {
  let filtered = analyzers;
  if (selectedIds && selectedIds.length > 0) {
    const idSet = new Set(selectedIds);
    filtered = filtered.filter((a) => idSet.has(a.id));
  }
  return filtered.filter((a) => a.shouldRun(context));
}
__name(filterAnalyzers, "filterAnalyzers");
async function runParallel(analyzers, context, timeout) {
  const promises = analyzers.map((analyzer) => runWithTimeout(analyzer, context, timeout));
  return Promise.all(promises);
}
__name(runParallel, "runParallel");
async function runSequential(analyzers, context, timeout) {
  const results = [];
  for (const analyzer of analyzers) {
    const result = await runWithTimeout(analyzer, context, timeout);
    results.push(result);
  }
  return results;
}
__name(runSequential, "runSequential");
async function runWithTimeout(analyzer, context, timeout) {
  const start = Date.now();
  try {
    const result = await Promise.race([
      analyzer.analyze(context),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Analyzer '${analyzer.id}' timed out after ${timeout}ms`)), timeout);
      })
    ]);
    return result;
  } catch (error) {
    return {
      analyzer: analyzer.id,
      success: false,
      issues: [
        {
          id: `pipeline/${analyzer.id}/error`,
          severity: "high",
          type: "ANALYZER_ERROR",
          message: error instanceof Error ? error.message : String(error)
        }
      ],
      coverage: 0,
      duration: Date.now() - start
    };
  }
}
__name(runWithTimeout, "runWithTimeout");
function buildCoverageInfo(results, context) {
  const coverage = {
    astParsed: false,
    securityChecked: false,
    completenessChecked: false,
    architectureChecked: false,
    importGraphChecked: false,
    complexityChecked: false,
    filesCoverage: 0
  };
  for (const result of results) {
    const field = ANALYZER_COVERAGE_MAP[result.analyzer];
    if (field && field !== "filesCoverage" && result.success) {
      coverage[field] = true;
    }
  }
  const totalFiles = context.files.length;
  if (totalFiles > 0) {
    const successfulResults = results.filter((r) => r.success);
    const avgCoverage = successfulResults.length > 0 ? successfulResults.reduce((sum, r) => sum + r.coverage, 0) / successfulResults.length : 0;
    coverage.filesCoverage = avgCoverage;
  }
  return coverage;
}
__name(buildCoverageInfo, "buildCoverageInfo");
function calculateConfidence(results, coverage) {
  const breakdown = {};
  let weightedSum = 0;
  let totalWeight = 0;
  let maxPossible = 0;
  for (const [id, weight] of Object.entries(CONFIDENCE_WEIGHTS)) {
    const result = results.find((r) => r.analyzer === id);
    totalWeight += weight;
    if (result) {
      const analyzerConfidence = result.success ? result.coverage : 0;
      breakdown[id] = analyzerConfidence;
      weightedSum += weight * analyzerConfidence;
      maxPossible += weight;
    } else {
      breakdown[id] = 0;
    }
  }
  const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const maxPossibleConfidence = totalWeight > 0 ? maxPossible / totalWeight : 0;
  const ranCount = results.filter((r) => r.success).length;
  const totalAnalyzers = Object.keys(CONFIDENCE_WEIGHTS).length;
  const explanationParts = [
    `${ranCount}/${totalAnalyzers} analyzers ran successfully`,
    `Files coverage: ${(coverage.filesCoverage * 100).toFixed(0)}%`
  ];
  const failedAnalyzers = results.filter((r) => !r.success);
  if (failedAnalyzers.length > 0) {
    explanationParts.push(`Failed: ${failedAnalyzers.map((r) => r.analyzer).join(", ")}`);
  }
  return {
    confidence: Math.round(confidence * 100) / 100,
    breakdown,
    explanation: explanationParts.join(". "),
    maxPossibleConfidence: Math.round(maxPossibleConfidence * 100) / 100
  };
}
__name(calculateConfidence, "calculateConfidence");
function groupBySeverity(issues) {
  const grouped = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: []
  };
  for (const issue of issues) {
    const severity = issue.severity || "info";
    if (severity in grouped) {
      grouped[severity].push(issue);
    } else {
      grouped.info.push(issue);
    }
  }
  return grouped;
}
__name(groupBySeverity, "groupBySeverity");

// ../../packages/core/dist/analysis/static/index.js
async function detectOrphans(_workspacePath, _options) {
  return [];
}
__name(detectOrphans, "detectOrphans");
async function checkFilesForOrphanStatus(_files, _workspaceRoot, _options) {
  return {};
}
__name(checkFilesForOrphanStatus, "checkFilesForOrphanStatus");
async function filterOrphansToFiles(_candidateFiles, _workspaceRoot, _options) {
  return [];
}
__name(filterOrphansToFiles, "filterOrphansToFiles");
async function runStaticAnalysis(files, _workspaceRoot, options = {}) {
  const startTime = Date.now();
  const result = {
    skippedTests: [],
    orphanedFiles: [],
    duration: 0,
    success: true,
    errors: []
  };
  if (!options.skipTestDetection) {
    try {
      const { analyzeSkippedTests: analyzeSkippedTests2 } = await import('./SkippedTestDetector-PJSKSOZR.js');
      const testResults = analyzeSkippedTests2(files);
      for (const testResult of testResults) {
        if (!testResult.parsed && testResult.error) {
          result.errors.push(`Parse error in ${testResult.file}: ${testResult.error}`);
        }
        for (const skipped of testResult.skipped) {
          result.skippedTests.push({
            file: skipped.file,
            type: skipped.type,
            name: skipped.name,
            line: skipped.line
          });
        }
      }
    } catch (error) {
      result.errors.push(`Skipped test detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  void options.skipOrphanDetection;
  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;
  return result;
}
__name(runStaticAnalysis, "runStaticAnalysis");

export { ChangeImpactAnalyzer, CompletenessAnalyzer, ComplexityAnalyzer, ImportGraphAnalyzer, SecurityAnalyzer, SyntaxAnalyzer, checkFilesForOrphanStatus, countASTNodes, createChangeImpactAnalyzer, detectOrphans, extractImportSources, extractImports, extractImportsBatch, filterOrphansToFiles, isSupportedFile, offsetToLine, parseSource, runAnalysisPipeline, runStaticAnalysis, walkAST };
//# sourceMappingURL=chunk-F7GEJLP7.js.map
//# sourceMappingURL=chunk-F7GEJLP7.js.map