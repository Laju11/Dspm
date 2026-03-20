const path = require('path');
const fs = require('fs');
const scrape = require('website-scraper');

function safeFolderName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
}

async function cloneWebsite({ url, projectName }) {
  const timestamp = Date.now();
  const folderName = `${safeFolderName(projectName || 'project')}-${timestamp}`;
  const targetDir = path.join(__dirname, '..', 'clones', folderName);

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  await scrape({
    urls: [url],
    directory: targetDir,
    recursive: true,
    maxDepth: 2,
    maxRecursiveDepth: 2,
    requestConcurrency: 3
  });

  return targetDir;
}

module.exports = {
  cloneWebsite
};
