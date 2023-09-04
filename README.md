# Update your Obsidian clippings to YAML

## Why This Code?

To convert a repo with dataview inline format to YAML and take advantage of new Obisidan property (see [changelog](https://obsidian.md/changelog/2023-08-31-desktop-v1.4.5)

To clip articles to Obsidian, you might have used Obsidian [WebClipper](https://gist.github.com/kepano/90c05f162c37cf730abb8ff027987ca3   ) offered by Steph Ango, the CEO of Obsidian, or derivated work.


In this case, you might have ended with files that have the following structure : 

```js  
author:: XXX
source:: URL link 
clipped:: DateOfClipping
published:: DateOfPublication 

#clippings
```

But now you want something more like :
```js 
---
category: "[[Clippings]]"
author: XXX scrapped from the META tags of the page at URL   
title: Title scrapped from the META tags of the page at URL   
source: URL link
clipped: DateOfClipping
description: Description scrapped from the META tags of the page at URL   
summary: ""  (Some space to put the summary later)
tags:
  - AI
  - other tags taken from the META keyword tag
publish: false
```

Note that I have also updated the official webclipper to give a consistent result, here is my JS version :  [WebClipper](https://gist.github.com/jppaolim/97552a7c424a7ae5d2c17ce846eadeee   )  


## How to Install

Clone the repository, go into the repo then install the packages : 
```bash
npm install
```

## How to Use

First remember to back up your vault before running. 

1. Place all the Markdown files you want to process in a  `Ressources` Subdirectory of your vault. Then do a symbolic link to this subdiretory from within the project repo : 
    ```bash
    cd ObsidianRepoUpdate
    ln -s -v  PATH_TO_YOUR_RESSOURCEDIR ./Ressources
    ```

2. Run the script:
    ```bash
    node index.js
    ```
3. Processed files will be moved to the `Ressources/Processed` directory.
4. New Markdown files with the fetched article content will be generated in the `Ressources/Result` directory.
5. Files that could not be processed will be moved to the `Ressources/ToProcessManually` directory.

### Notes:

- Check the `error.log` file for any errors that may have occurred during the process

- You still need to process around 10/20% of files manually

- I have noticed sometimes the [WebClipper](https://gist.github.com/kepano/90c05f162c37cf730abb8ff027987ca3   )  doesn't produce very clean image links. fixMarkdown.js is an attempt to fix this.

## What Does It Do?

The `index.js` script performs the following tasks:

1. Reads markdown files from the `Ressources` directory.
2. Extracts URLs from each markdown file that it finds after the "source", "src" or "url"
3. Re-implement a version of the WebClipper to recreate a new markdown file. 
4. Writes the newly generated markdown content into a `Result` sub-directory within `Ressources`.
5. Moves processed files into a `Processed` sub-directory within `Ressources`.
6. If a URL is not found, moves the original file into a `ToProcessManually` sub-directory within `Ressources`.
7. Logs any further errors that occur to `error.log`.

## License

This project is licensed under the MIT License. However other piece of codes are subject to specific licenses : 


- Readability.js by Mozilla (Licensed under Apache License Version 2.0)
- Turndown by Dom Christie Licensed under MIT License)