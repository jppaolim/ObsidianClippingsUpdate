const path = require("path");
const fs = require("fs");
const { glob } = require("glob");

// Read all markdown files in a directory and process them
async function processFiles() {
  // Use glob with promises, no recursive
  const files = await glob("Ressources/**/*.md");

  try {
    for (const file of files) {
      //console.log(`Processing file: ${file}`);
      const originalText = fs.readFileSync(file, "utf8");
      const newText = fixMarkdownLinks(originalText);

      if (newText !== originalText) {
        fs.writeFileSync(file, newText);
        console.log(`New file has been written to ${file}`);
      }
    }
} catch (err) {
    console.log("An error occurred:", err);
}
}

function fixMarkdownLinks(text) {
  const regex = /\[\s*\n*!\[\](?:\()([^\)]+)(?:\))\s*\n*\]\(([^)]+)\)/g;
  return text.replace(regex, "[![]($1)]($2)");
}

// Run the function
processFiles();
