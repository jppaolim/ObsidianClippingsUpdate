const axios = require("axios");
const jsdom = require("jsdom");
const path = require("path");
const fs = require("fs");
const TurndownService = require("turndown");
const Readability = require("@mozilla/readability").Readability;
const { glob } = require("glob");
const { JSDOM } = jsdom;

/**
 * Main function to process Markdown files by scraping corresponding URLs and updating content.
 */
async function processFiles() {

  // Create necessary subdirectories if they don't exist
  if (!fs.existsSync("Ressources/Processed")) fs.mkdirSync("Ressources/Processed");
  if (!fs.existsSync("Ressources/Result")) fs.mkdirSync("Ressources/Result");
  if (!fs.existsSync("Ressources/ToProcessManually")) fs.mkdirSync("Ressources/ToProcessManually");

  // Get list of all markdown files to be processed
  const files = await glob("Ressources/*.md");

  try {

    // Loop through each file and process it
    for (const file of files) {

      // Read the original content of the file
      const originalText = fs.readFileSync(file, "utf8");
 
      // Extract URL from the markdown content
      const url = extractURL(originalText);
      
      // If no URL is found, move file for manual processing
      if (!url) {
        console.log(`No URL found in file ${file}. Moving to ToProcessManually.`);
        const newLocation = path.join("Ressources/ToProcessManually", path.basename(file));
        fs.renameSync(file, newLocation);
        continue;
      }

      // If a URL is found, fetch the article and update the markdown file
      const clippedDate = extractDate(originalText);
      try {
        const { fileContent, sanitizedTitle } = await pullMarkDown(
          url,
          clippedDate
        );

        // Move the original file to 'Processed' directory 
        const processedFileName = path.join("Ressources/Processed", path.basename(file));
        fs.renameSync(file, processedFileName);

        // Write the new content to a file in the 'Result' directory
        const resultFileName = path.join("Ressources/Result",path.basename(file));
        fs.writeFileSync(resultFileName, fileContent);

        console.log(`New file has been written to ${resultFileName}`);
        console.log(`Original file has been moved to ${processedFileName}`);

      } catch (error) {
        logErrorToFile(`Failed to process URL ${url} from file ${file}: ${error}`); 
      }
    }
  } catch (err) {
    logErrorToFile("An error occurred:", err);
  }
}

async function pullMarkDown(url, clippedDate) {
  const { data } = await axios.get(url);
  const { window } = new JSDOM(data, {
    url: url, // Needed for Readability to resolve relative URLs
    resources: "usable", // Load subresources to ensure accurate readability
  });

  const { document } = window;

  // Using Readability
  const reader = new Readability(document);
  const article = reader.parse();

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  
  let markdownBody = turndownService.turndown(article.content);
  markdownBody = fixMarkdownLinks(markdownBody);


  /// Handle Tags
  var tagLines = ["tags:"];
  tagLines.push("  - AI"); // The initial "AI" tag

  const metaKeywordsElement = document.querySelector('meta[name="keywords" i]');
  if (metaKeywordsElement) {
    const keywordsContent = metaKeywordsElement.getAttribute("content");
    if (keywordsContent) {
      const keywords = keywordsContent.split(",");
      keywords.forEach((keyword) => {
        const tag = keyword.trim();
        tagLines.push("  - " + tag);
      });
    }
  }

  const tagsYAML = tagLines.join("\n"); // Join each line into a single string

  function sanitizeYAMLstring(str) {
    return str.replace(/["'“”‘’]/g, "");
  }

  // handle title
  const sanitizedTitle = sanitizeYAMLstring(article.title);

  //handle date

  var date;
  if (clippedDate) {
    date = clippedDate; // Use the extracted date
  } else {
    const currentDate = new Date();
    date = convertDate(currentDate); // Use today's date
  }

  // Utility function to get meta content by name or property
  function getMetaContent(attr, value) {
    var element = document.querySelector(`meta[${attr}='${value}']`);
    return element ? element.getAttribute("content").trim() : "";
  }

  // Fetch byline, meta author, property author, or site name
  var author =
    getMetaContent("name", "author") ||
    getMetaContent("property", "author") ||
    getMetaContent("property", "og:site_name");

  // Check if there's an author and add brackets
  var authorBrackets = author ? `"[[${author}]]"` : "";

  // Get description
  var desc =
    getMetaContent("name", "description") ||
    getMetaContent("property", "description") ||
    getMetaContent("property", "og:description");
  const sanitizedDesc = sanitizeYAMLstring(desc);

  const fileContent =
    "---\n" +
    'category: "[[Clippings]]"\n' +
    "author: " +
    authorBrackets +
    "\n" +
    'title: "' +
    sanitizedTitle +
    '"\n' +
    "source: " +
    document.URL +
    "\n" +
    "clipped: " +
    date +
    "\n" +
    'description: "' +
    sanitizedDesc +
    '"\n' +
    'summary: "' +
    '"\n' +
    tagsYAML +
    "\n" + // Include the tags in the new format
    "publish: false\n" +
    "---\n\n" +
    "# " +
    sanitizedTitle +
    '"\n' +
    markdownBody;

  return { fileContent, sanitizedTitle };
}


// Function to log errors to a file
function logErrorToFile(error) {
  const errorMessage = `[${new Date().toISOString()}] ${error}\n`;
  fs.appendFileSync('error.log', errorMessage);
}

function extractURL(text) {
  // Match "URL", "source", "src", case-insensitive followed by any number of non-newline characters and then a URL
  // The URL can either be stand-alone or within a Markdown link
  const regex = /(URL|source|src)[^\n]*?((https?:\/\/[^\s\)]+))\)?/i;

  const match = text.match(regex);

  if (match) {
    // Remove UTM parameters
    return match[2].replace(/(\?|&)utm_[^?&]+/g, '');
  } else {
    return null;
  }
}

function extractDate(text) {
  // Match "clipped:", "clipped::", "date", or "Date" followed by any number of characters and then the brackets with a date inside
  const regex =
    /(clipped:|clipped::|date|Date).*?\[\[([0-9]{4}-[0-9]{2}-[0-9]{2})\]\]/i;
  const match = text.match(regex);
  return match ? match[2] : null; // match[2] will contain the actual date if found
}

function fixMarkdownLinks(text) {
  const regex = /\[\s*\n*!\[\](?:\()([^\)]+)(?:\))\s*\n*\]\(([^)]+)\)/g;
  return text.replace(regex, "[![]($1)]($2)");
}

function convertDate(date) {
  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth() + 1).toString();
  var dd = date.getDate().toString();
  var mmChars = mm.split("");
  var ddChars = dd.split("");
  return (
    yyyy +
    "-" +
    (mmChars[1] ? mm : "0" + mmChars[0]) +
    "-" +
    (ddChars[1] ? dd : "0" + ddChars[0])
  );
}

// Run the function
processFiles();
