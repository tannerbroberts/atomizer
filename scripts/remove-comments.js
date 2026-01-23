#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function removeCommentsFromLine(line) {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = null;
    let inRegex = false;
    let escaped = false;
    let inTemplateString = false;

    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (escaped) {
            result += char;
            escaped = false;
            i++;
            continue;
        }

        if (char === '\\' && (inString || inTemplateString)) {
            result += char;
            escaped = true;
            i++;
            continue;
        }

        if (inTemplateString) {
            result += char;
            if (char === '`') {
                inTemplateString = false;
            }
            i++;
            continue;
        }

        if (inString) {
            result += char;
            if (char === stringChar) {
                inString = false;
                stringChar = null;
            }
            i++;
            continue;
        }

        if (inRegex) {
            result += char;
            if (char === '/' && !escaped) {
                inRegex = false;
            }
            if (char === '\\') {
                escaped = true;
            }
            i++;
            continue;
        }

        if (char === '`') {
            result += char;
            inTemplateString = true;
            i++;
            continue;
        }

        if (char === '"' || char === "'") {
            result += char;
            inString = true;
            stringChar = char;
            i++;
            continue;
        }

        if (char === '/' && nextChar === '/') {
            break;
        }

        if (char === '/' && nextChar !== '*') {
            const prevNonSpace = result.trim().slice(-1);
            const regexIndicators = ['=', '(', '[', ',', ':', '!', '&', '|', '?', '+', '-', '*', '%', '^', '~', '{', ';', '\n', ''];
            if (regexIndicators.includes(prevNonSpace) || result.trim() === '') {
                result += char;
                inRegex = true;
                i++;
                continue;
            }
        }

        result += char;
        i++;
    }

    return result.trimEnd();
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const processedLines = lines.map(line => removeCommentsFromLine(line));
        const newContent = processedLines.join('\n');

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Processed: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return false;
    }
}

function getAllJSFiles(dir, excludeDirs = []) {
    let results = [];

    try {
        const list = fs.readdirSync(dir);

        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat && stat.isDirectory()) {
                if (!excludeDirs.includes(file)) {
                    results = results.concat(getAllJSFiles(filePath, excludeDirs));
                }
            } else if (file.endsWith('.js')) {
                results.push(filePath);
            }
        });
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }

    return results;
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        const srcFiles = getAllJSFiles('src');
        const testFiles = getAllJSFiles('tests', ['test-fixtures']);
        const rootFile = 'index.js';

        const allFiles = [...srcFiles, ...testFiles];
        if (fs.existsSync(rootFile)) {
            allFiles.push(rootFile);
        }

        console.log(`Found ${allFiles.length} files to process\n`);

        let successCount = 0;
        let failCount = 0;

        allFiles.forEach(file => {
            if (processFile(file)) {
                successCount++;
            } else {
                failCount++;
            }
        });

        console.log(`\nComplete! Processed ${successCount} files successfully, ${failCount} failures`);
    } else {
        args.forEach(file => {
            processFile(file);
        });
    }
}

if (require.main === module) {
    main();
}

module.exports = { removeCommentsFromLine, processFile };
