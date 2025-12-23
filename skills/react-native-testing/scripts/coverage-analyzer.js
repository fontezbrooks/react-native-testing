#!/usr/bin/env node
/**
 * React Native Test Coverage Analyzer
 *
 * Analyzes test coverage and provides actionable recommendations
 * for improving test quality in React Native projects.
 *
 * Usage:
 *   node coverage-analyzer.js <project-path> [options]
 *
 * Options:
 *   --threshold <number>  Minimum coverage threshold (default: 70)
 *   --verbose, -v         Enable verbose output
 *   --json                Output results as JSON
 *   --output, -o <path>   Write report to file
 *   --focus <area>        Focus on: components, hooks, utils, screens
 */

const fs = require('fs');
const path = require('path');

class CoverageAnalyzer {
  constructor(projectPath, options = {}) {
    this.projectPath = path.resolve(projectPath);
    this.options = {
      threshold: 70,
      verbose: false,
      json: false,
      focus: null,
      ...options,
    };
    this.results = {
      summary: {},
      files: [],
      recommendations: [],
      untested: [],
    };
  }

  run() {
    console.log('📊 React Native Test Coverage Analyzer');
    console.log('='.repeat(50));

    try {
      this.validateProject();
      this.findCoverageReport();
      this.analyzeFiles();
      this.generateRecommendations();
      this.outputResults();

      console.log('\n✅ Analysis completed!');
      return this.results;
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  validateProject() {
    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Project path not found: ${this.projectPath}`);
    }

    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('Not a valid npm project (missing package.json)');
    }

    if (this.options.verbose) {
      console.log(`📁 Project: ${this.projectPath}`);
    }
  }

  findCoverageReport() {
    const coveragePaths = [
      path.join(this.projectPath, 'coverage', 'coverage-summary.json'),
      path.join(this.projectPath, 'coverage', 'lcov-report', 'index.html'),
      path.join(this.projectPath, 'coverage', 'coverage-final.json'),
    ];

    this.coveragePath = coveragePaths.find(p => fs.existsSync(p));

    if (this.coveragePath && this.coveragePath.endsWith('.json')) {
      this.coverageData = JSON.parse(fs.readFileSync(this.coveragePath, 'utf-8'));
      console.log(`📈 Found coverage report: ${this.coveragePath}`);
    } else {
      console.log('⚠️  No coverage report found. Run: npm test -- --coverage');
      this.coverageData = null;
    }
  }

  analyzeFiles() {
    console.log('\n🔍 Analyzing source files...');

    const srcPath = path.join(this.projectPath, 'src');
    if (!fs.existsSync(srcPath)) {
      console.log('⚠️  No src directory found');
      return;
    }

    const sourceFiles = this.findSourceFiles(srcPath);
    const testFiles = this.findTestFiles(srcPath);

    // Map source files to their test status
    sourceFiles.forEach(file => {
      const relativePath = path.relative(this.projectPath, file);
      const testFile = this.findMatchingTest(file, testFiles);
      const coverage = this.getFileCoverage(relativePath);

      const analysis = {
        file: relativePath,
        hasTest: !!testFile,
        testFile: testFile ? path.relative(this.projectPath, testFile) : null,
        coverage: coverage,
        type: this.classifyFile(file),
        complexity: this.estimateComplexity(file),
        priority: 'low',
      };

      // Calculate priority
      analysis.priority = this.calculatePriority(analysis);

      this.results.files.push(analysis);

      if (!testFile) {
        this.results.untested.push(analysis);
      }
    });

    // Sort by priority
    this.results.files.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Calculate summary
    this.results.summary = {
      totalFiles: sourceFiles.length,
      testedFiles: sourceFiles.length - this.results.untested.length,
      untestedFiles: this.results.untested.length,
      coveragePercentage: this.calculateOverallCoverage(),
      threshold: this.options.threshold,
      meetingThreshold: this.calculateOverallCoverage() >= this.options.threshold,
    };

    if (this.options.verbose) {
      console.log(`\n📋 Summary:`);
      console.log(`  Total files: ${this.results.summary.totalFiles}`);
      console.log(`  Files with tests: ${this.results.summary.testedFiles}`);
      console.log(`  Files without tests: ${this.results.summary.untestedFiles}`);
      console.log(`  Coverage: ${this.results.summary.coveragePercentage.toFixed(1)}%`);
    }
  }

  findSourceFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['__tests__', '__mocks__', 'node_modules', '.git'].includes(entry.name)) {
          this.findSourceFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const name = entry.name;

        // Skip test files and type definitions
        if (
          ['.tsx', '.ts', '.jsx', '.js'].includes(ext) &&
          !name.includes('.test.') &&
          !name.includes('.spec.') &&
          !name.includes('.d.ts') &&
          !name.includes('.stories.')
        ) {
          // Apply focus filter if set
          if (this.options.focus) {
            const type = this.classifyFile(fullPath);
            if (type !== this.options.focus) {
              continue;
            }
          }

          files.push(fullPath);
        }
      }
    }

    return files;
  }

  findTestFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.git'].includes(entry.name)) {
          this.findTestFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const name = entry.name;
        if (name.includes('.test.') || name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  findMatchingTest(sourceFile, testFiles) {
    const sourceName = path.basename(sourceFile, path.extname(sourceFile));
    const sourceDir = path.dirname(sourceFile);

    // Look for test in same directory
    const sameDir = testFiles.find(tf => {
      const testDir = path.dirname(tf);
      const testName = path.basename(tf).replace(/\.test\.|\.spec\./, '.');
      return testDir === sourceDir && testName.startsWith(sourceName);
    });

    if (sameDir) return sameDir;

    // Look for test in __tests__ subdirectory
    const testsDir = testFiles.find(tf => {
      const testDir = path.dirname(tf);
      const testName = path.basename(tf).replace(/\.test\.|\.spec\./, '.');
      return testDir === path.join(sourceDir, '__tests__') && testName.startsWith(sourceName);
    });

    return testsDir || null;
  }

  classifyFile(filePath) {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes('/components/') || pathLower.includes('/component/')) {
      return 'components';
    }
    if (pathLower.includes('/hooks/') || pathLower.includes('/hook/') || path.basename(filePath).startsWith('use')) {
      return 'hooks';
    }
    if (pathLower.includes('/screens/') || pathLower.includes('/screen/') || pathLower.includes('/pages/')) {
      return 'screens';
    }
    if (pathLower.includes('/utils/') || pathLower.includes('/helpers/') || pathLower.includes('/lib/')) {
      return 'utils';
    }
    if (pathLower.includes('/api/') || pathLower.includes('/services/')) {
      return 'services';
    }
    if (pathLower.includes('/contexts/') || pathLower.includes('/providers/')) {
      return 'contexts';
    }

    return 'other';
  }

  estimateComplexity(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      let score = 0;

      // Lines of code
      const lines = content.split('\n').length;
      if (lines > 200) score += 3;
      else if (lines > 100) score += 2;
      else if (lines > 50) score += 1;

      // Conditional complexity
      const conditionals = (content.match(/if\s*\(|&&|\|\||switch\s*\(|\?/g) || []).length;
      if (conditionals > 10) score += 3;
      else if (conditionals > 5) score += 2;
      else if (conditionals > 2) score += 1;

      // Async operations
      if (/async|await|Promise|\.then\(/i.test(content)) score += 2;

      // State management
      const stateHooks = (content.match(/useState|useReducer|useContext/g) || []).length;
      score += Math.min(stateHooks, 3);

      // Effects
      const effects = (content.match(/useEffect|useMemo|useCallback/g) || []).length;
      score += Math.min(effects, 2);

      if (score >= 8) return 'high';
      if (score >= 4) return 'medium';
      return 'low';
    } catch {
      return 'unknown';
    }
  }

  getFileCoverage(relativePath) {
    if (!this.coverageData) return null;

    // Try to find coverage for this file
    const fileCoverage = Object.keys(this.coverageData).find(key =>
      key.includes(relativePath) || relativePath.includes(key.replace(/^\.\//, ''))
    );

    if (fileCoverage && this.coverageData[fileCoverage]) {
      const data = this.coverageData[fileCoverage];

      if (data.lines) {
        return {
          lines: data.lines.pct || 0,
          branches: data.branches?.pct || 0,
          functions: data.functions?.pct || 0,
          statements: data.statements?.pct || 0,
        };
      }
    }

    return null;
  }

  calculateOverallCoverage() {
    if (!this.coverageData) {
      // Estimate based on test presence
      if (this.results.summary.totalFiles === 0) return 0;
      return (this.results.summary.testedFiles / this.results.summary.totalFiles) * 100;
    }

    const total = this.coverageData.total;
    if (total && total.lines) {
      return total.lines.pct || 0;
    }

    return 0;
  }

  calculatePriority(analysis) {
    // Critical: Complex files without tests
    if (!analysis.hasTest && analysis.complexity === 'high') {
      return 'critical';
    }

    // High: Screen components or hooks without tests
    if (!analysis.hasTest && ['screens', 'hooks'].includes(analysis.type)) {
      return 'high';
    }

    // High: Files with low coverage
    if (analysis.coverage && analysis.coverage.lines < 50) {
      return 'high';
    }

    // Medium: Files without tests
    if (!analysis.hasTest) {
      return 'medium';
    }

    // Medium: Files below threshold
    if (analysis.coverage && analysis.coverage.lines < this.options.threshold) {
      return 'medium';
    }

    return 'low';
  }

  generateRecommendations() {
    console.log('\n💡 Generating recommendations...');

    // Group untested files by type
    const untestedByType = {};
    this.results.untested.forEach(file => {
      const type = file.type;
      if (!untestedByType[type]) {
        untestedByType[type] = [];
      }
      untestedByType[type].push(file);
    });

    // Generate recommendations
    const recommendations = [];

    // Critical: Untested high-complexity files
    const critical = this.results.files.filter(f => f.priority === 'critical');
    if (critical.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'Missing Tests',
        message: `${critical.length} high-complexity file(s) have no tests`,
        files: critical.map(f => f.file),
        action: 'Add comprehensive tests immediately',
      });
    }

    // High: Untested screens/hooks
    ['screens', 'hooks'].forEach(type => {
      const untested = untestedByType[type] || [];
      if (untested.length > 0) {
        recommendations.push({
          priority: 'high',
          category: `Untested ${type}`,
          message: `${untested.length} ${type} without tests`,
          files: untested.map(f => f.file),
          action: `Add integration tests for ${type}`,
        });
      }
    });

    // Medium: Low coverage files
    const lowCoverage = this.results.files.filter(f =>
      f.coverage && f.coverage.lines < this.options.threshold && f.coverage.lines > 0
    );
    if (lowCoverage.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Low Coverage',
        message: `${lowCoverage.length} file(s) below ${this.options.threshold}% coverage`,
        files: lowCoverage.map(f => `${f.file} (${f.coverage.lines.toFixed(1)}%)`),
        action: 'Add more test cases to improve coverage',
      });
    }

    // General: Overall coverage below threshold
    if (this.results.summary.coveragePercentage < this.options.threshold) {
      recommendations.push({
        priority: 'medium',
        category: 'Overall Coverage',
        message: `Project coverage (${this.results.summary.coveragePercentage.toFixed(1)}%) is below target (${this.options.threshold}%)`,
        action: 'Prioritize testing high-complexity and frequently-changed files',
      });
    }

    // Best practices
    if (this.results.untested.length > 0) {
      recommendations.push({
        priority: 'info',
        category: 'Best Practice',
        message: 'Consider generating test scaffolds for untested files',
        action: 'Run: node component-test-generator.js <file-path>',
      });
    }

    this.results.recommendations = recommendations;
  }

  outputResults() {
    if (this.options.json) {
      const output = JSON.stringify(this.results, null, 2);

      if (this.options.output) {
        fs.writeFileSync(this.options.output, output);
        console.log(`\n📄 JSON report written to: ${this.options.output}`);
      } else {
        console.log('\n' + output);
      }
      return;
    }

    // Print formatted report
    console.log('\n' + '='.repeat(50));
    console.log('COVERAGE ANALYSIS REPORT');
    console.log('='.repeat(50));

    console.log('\n📊 Summary:');
    console.log(`  Total Source Files: ${this.results.summary.totalFiles}`);
    console.log(`  Files with Tests: ${this.results.summary.testedFiles}`);
    console.log(`  Files without Tests: ${this.results.summary.untestedFiles}`);
    console.log(`  Coverage: ${this.results.summary.coveragePercentage.toFixed(1)}%`);
    console.log(`  Target: ${this.results.summary.threshold}%`);
    console.log(`  Status: ${this.results.summary.meetingThreshold ? '✅ Meeting target' : '⚠️ Below target'}`);

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');

      const priorityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        info: 'ℹ️',
      };

      this.results.recommendations.forEach((rec, i) => {
        console.log(`\n  ${priorityEmoji[rec.priority]} ${rec.priority.toUpperCase()}: ${rec.category}`);
        console.log(`     ${rec.message}`);
        if (rec.files && rec.files.length > 0) {
          const displayFiles = rec.files.slice(0, 5);
          displayFiles.forEach(f => console.log(`       • ${f}`));
          if (rec.files.length > 5) {
            console.log(`       ... and ${rec.files.length - 5} more`);
          }
        }
        console.log(`     Action: ${rec.action}`);
      });
    }

    console.log('\n' + '='.repeat(50));

    if (this.options.output) {
      const report = this.formatTextReport();
      fs.writeFileSync(this.options.output, report);
      console.log(`📄 Report written to: ${this.options.output}`);
    }
  }

  formatTextReport() {
    let report = 'REACT NATIVE TEST COVERAGE REPORT\n';
    report += '='.repeat(50) + '\n\n';

    report += 'SUMMARY\n';
    report += '-'.repeat(30) + '\n';
    report += `Total Files: ${this.results.summary.totalFiles}\n`;
    report += `With Tests: ${this.results.summary.testedFiles}\n`;
    report += `Without Tests: ${this.results.summary.untestedFiles}\n`;
    report += `Coverage: ${this.results.summary.coveragePercentage.toFixed(1)}%\n`;
    report += `Target: ${this.results.summary.threshold}%\n\n`;

    if (this.results.untested.length > 0) {
      report += 'UNTESTED FILES\n';
      report += '-'.repeat(30) + '\n';
      this.results.untested.forEach(f => {
        report += `  [${f.priority}] ${f.file} (${f.type}, ${f.complexity} complexity)\n`;
      });
      report += '\n';
    }

    report += 'RECOMMENDATIONS\n';
    report += '-'.repeat(30) + '\n';
    this.results.recommendations.forEach(rec => {
      report += `\n[${rec.priority.toUpperCase()}] ${rec.category}\n`;
      report += `  ${rec.message}\n`;
      report += `  Action: ${rec.action}\n`;
    });

    return report;
  }
}

// CLI Entry Point
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
React Native Test Coverage Analyzer

Usage:
  node coverage-analyzer.js <project-path> [options]

Options:
  --threshold <n>     Minimum coverage threshold (default: 70)
  --verbose, -v       Enable verbose output
  --json              Output results as JSON
  --output, -o <path> Write report to file
  --focus <area>      Focus on: components, hooks, utils, screens
  --help, -h          Show this help message

Examples:
  node coverage-analyzer.js .
  node coverage-analyzer.js ./my-app --threshold 80
  node coverage-analyzer.js . --json --output coverage-report.json
  node coverage-analyzer.js . --focus hooks --verbose
`);
    process.exit(0);
  }

  const projectPath = args[0];
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    json: args.includes('--json'),
  };

  // Parse --threshold
  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    options.threshold = parseInt(args[thresholdIndex + 1], 10);
  }

  // Parse --output
  const outputIndex = args.findIndex(a => a === '--output' || a === '-o');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.output = args[outputIndex + 1];
  }

  // Parse --focus
  const focusIndex = args.indexOf('--focus');
  if (focusIndex !== -1 && args[focusIndex + 1]) {
    options.focus = args[focusIndex + 1];
  }

  const analyzer = new CoverageAnalyzer(projectPath, options);
  analyzer.run();
}

main();
