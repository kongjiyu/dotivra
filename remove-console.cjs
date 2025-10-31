const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Remove console.log() and console.warn() statements more aggressively
        // Match console.log or console.warn followed by anything until semicolon or newline
        content = content.replace(/^\s*console\.(log|warn)\([\s\S]*?\);?\s*$/gm, '');

        // Also handle inline console statements
        content = content.replace(/console\.(log|warn)\([^)]*\);?\s*/g, '');

        // Clean up multiple empty lines (max 2 consecutive)
        content = content.replace(/\n{3,}/g, '\n\n');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return false;
    }
}

function walkDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and dist
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                walkDirectory(filePath, fileList);
            }
        } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const functionsDir = path.join(__dirname, 'functions', 'src');

console.log('🔍 Finding files to process...');

let files = [];
if (fs.existsSync(srcDir)) {
    files = files.concat(walkDirectory(srcDir));
}
if (fs.existsSync(functionsDir)) {
    files = files.concat(walkDirectory(functionsDir));
}

console.log(`📝 Found ${files.length} files to check\n`);

let updatedCount = 0;
files.forEach(file => {
    if (processFile(file)) {
        updatedCount++;
        console.log(`✅ Updated: ${path.relative(__dirname, file)}`);
    }
});

console.log(`\n✨ Complete! Updated ${updatedCount} files`);
