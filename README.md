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

Running `hyextract` for the first time will create a config file (see below). You will want to fill in your API key from Hydrus and setup any other settings like the directory for archives to process and the temp directory used for extracting them. 

Once configured, running `hyextract` will attempt to go through all the archive files in the set `archivesDirectory`, look up their hash in the Hydrus API, extract them, and add the resulting files to Hydrus with the tags and URLs from the original archive file.

## Config File:

Example config file:

```json
{
  "hydrusApiUrl": "http://localhost:45869",
  "hydrusApiKey": "API_KEY_HERE",
  "archivesDirectory": "E:\\hydrus export\\hyextract",
  "tempDirectory": "E:\\hyextract temp",
  "copyTags": true,
  "copyUrls": true,
  "tagServices": [
    "my tags",
    "imported tags"
  ],
  "passwordNamespace": "password",
  "passwordHexNamespace": "password hex",
  "tagBlacklist": [],
  "namespaceBlacklist": [
    "filename",
    "password",
    "password hex"
  ],
  "tagFilenames": true,
  "filenameTagService": "my tags",
  "deleteOriginalArchiveFromDirectory": true,
  "deleteOriginalArchiveFromHydrus": true,
  "deleteTempFiles": true,
  "customServicesToTags": {
    "my tags": [
      "hyextract"
    ]
  },
  "moveUnimportedFiles": true,
  "unimportedFilesDirectory": "E:\\hyextract unimported"
}
```

| Config Item | Description |
|----|----|
| `hydrusApiUrl` | the URL of your Hydrus API |
| `hydrusApiKey` | an access key for the Hydrus API. It should have all permissions enabled. |
| `archivesDirectory` | the location to look for archives in. This can be a directory you manually export archives to or a Hydrus automatic export folder. All files in this directory must be named `{hash}.ext` where `{hash}` is the SHA256 hash which is how Hydrus will automatically export them when dragged out of the client. |
| `tempDirectory` | this is the temporary directory hyextract will extract archives to and tell Hydrus to import from. It will be wiped automatically if `deleteTempFiles` is enabled. |
| `copyTags` | should hyextract copy tags from the archive to the extracted files. |
| `copyUrls` | should hyextract copy URLs from the archive to the extracted files |
| `tagServices` | an array of the tag services that hyextract will copy tags from if `copyTags` is enabled. |
| `passwordNamespace` | the namespace to pull archive passwords from as plain text. This is used if no hex password is found. |
| `passwordNamespaceHex` | the namespace to pull archive passwords from as hex encoded UTF-8 strings. This is used first before `passwordNamespace`. Some parsers will output archive passwords in this format to preserve capital letters that a plain text tag would remove. |
| `tagBlacklist` | an array of tags to skip copying from the archive to the extracted files. |
| `namespaceBlacklist` | an array of tag namespaces to skip copying from the archive to the extracted files. |
| `tagFilenames` | should hyextract add `filename:` tags to extracted files when imported (affected by `copyTags`, not affected by `tagBlacklist` or `namespaceBlacklist`) |
| `filenameTagService` | the service to add `filename:` tags to when `tagFilenames` is enabled. |
| `deleteOriginalArchiveFromDirectory` | should hyextract delete the archive from `archivesDirectory` after importing its tiles. |
| `deleteOriginalArchiveFromHydrus` | should hyextract delete the archive from hydrus after importing its tiles. |
| `deleteTempFiles` | should hyextract clear `tempDirectory` after processing everything |
| `customServicesToTags` | an object that specifies constant tags to add to every extracted file. It is a map of service names to arrays of tags. |
| `moveUnimportedFiles` | should hyextract move files that hydrus was unable to import into a seperate directory. |
| `unimportedFilesDirectory` | the directory to move unimported files to if `moveUnimportedFiles` is enabled. |

If you ever want to regenerate this config file, run `hyextract --regenconfig`.
