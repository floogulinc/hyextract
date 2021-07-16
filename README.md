hyextract
=========

Extract archives from Hydrus with tags and URL associations

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/hyextract.svg)](https://npmjs.org/package/hyextract)
[![Downloads/week](https://img.shields.io/npm/dw/hyextract.svg)](https://npmjs.org/package/hyextract)
[![License](https://img.shields.io/npm/l/hyextract.svg)](https://github.com/floogulinc/hyextract/blob/master/package.json)

## Installation

With Node 12.14.0 or higher, run:

```sh-session
$ npm install -g hyextract
```

## Usage

To use hyextract you will need a folder of archive files from Hydrus named `{hash}.ext` where `{hash}` is the SHA256 hash. You can either drag the files from Hydrus into a folder or setup an automatic export folder for all files with the filetype.

Running `hyextract` for the first time will create a config file, for example:

```json
{
  "hydrusApiUrl": "http://localhost:45869",
  "hydrusApiKey": "API_KEY_HERE",
  "archivesDirectory": "E:\\hydrus export\\hyextract test",
  "tempDirectory": "E:\\hyextract temp",
  "copyTags": true,
  "copyUrls": true,
  "tagServices": [
    "my tags",
  ],
  "passwordNamespace": "password",
  "tagBlacklist": [],
  "namespaceBlacklist": [
    "filename",
    "password"
  ],
  "tagFilenames": true,
  "filenameTagService": "my tags",
  "deleteOriginalArchiveFromDirectory": true,
  "deleteOriginalArchiveFromHydrus": true,
  "deleteTempFiles": true
}
```

You will want to fill in your API key from Hydrus and setup any other settings like the directory for archives to process and the temp directory used for extracting them. The `passwordNamespace` option specifies the namespace hyextract will look for to find a password for password protected archives. If you ever want to regenerate this config file, run `hyextract --regenconfig`.

Once configured, running `hyextract` will attempt to go through all the archive files in the set `archivesDirectory`, look up their hash in the Hydrus API, extract them, and add the resulting files to Hydrus with the tags and URLs from the original archive file.
