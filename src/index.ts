import {Command, flags} from '@oclif/command'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import {lookupMetadata, HydrusApiInfo, addFile, deleteFiles, addTags, associateUrl, HydrusAddFileStatus, verifyAccessKey, apiVersion} from './hydrus-api'
import {namespaceTagFromFile, serviceTags, getNamespace, getTagValue} from './tag-utils'
import * as FileHound from 'filehound';
import * as sevenZip from '7zip-standalone/lib/7zip-standalone';

interface UserConfig {
  hydrusApiUrl: string;
  hydrusApiKey: string;
  archivesDirectory: string;
  tempDirectory: string;
  copyTags: boolean;
  copyUrls: boolean;
  tagServices: string[];
  passwordNamespace: string;
  passwordHexNamespace: string;
  tagBlacklist: string[];
  namespaceBlacklist: string[];
  tagFilenames: boolean;
  filenameTagService: string;
  deleteOriginalArchiveFromDirectory: boolean;
  deleteOriginalArchiveFromHydrus: boolean;
  deleteTempFiles: boolean;
  customServicesToTags: {
    [service: string]: string[];
  };
  moveUnimportedFiles: boolean;
  unimportedFilesDirectory: string;
}

function decodeHex(hexString: string) {
  return decodeURIComponent(hexString.replace(/[0-9a-f]{2}/g, '%$&'));
}

class Hyextract extends Command {
  static description = 'Extract archives from Hydrus with tags and URL associations'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),

    regenconfig: flags.boolean({description: 'regenerate the config file'})
  }

  static args = []

  async unpackArchive(pathToArchive: string, whereToUnpack: string, password?: string) {
    return sevenZip.extract(pathToArchive, whereToUnpack, ['-p' + (password ?? '')], data => data.forEach(s => this.log(s)));
  }

  async handleUnimportedFile(filePath: string, tempDirPath: string, unimportedFilesDirectory: string) {
    const relFilePath = filePath.replace(tempDirPath, '');
    const newPath = path.join(unimportedFilesDirectory, relFilePath);
    this.log(`moving unimported file ${filePath}`);
    this.log(`to ${newPath}`);
    return fs.move(filePath, newPath, {overwrite: true});
  }

  async run() {
    this.log(this.config.userAgent);
    const {args, flags} = this.parse(Hyextract)

    const configPath = path.join(this.config.configDir, 'config.json');

    this.debug(`config path: ${configPath}`);

    const defaultConfig: UserConfig = {
      hydrusApiUrl: 'http://localhost:45869',
      hydrusApiKey: 'API_KEY_HERE',
      archivesDirectory: path.join(os.homedir(), 'hyextract archives'),
      tempDirectory: path.join(os.tmpdir(), 'hyextract'),
      copyTags: true,
      copyUrls: true,
      tagServices: ['my tags'],
      passwordNamespace: 'password',
      passwordHexNamespace: 'password hex',
      tagBlacklist: [],
      namespaceBlacklist: [
        'filename',
        'password',
        'password hex'
      ],
      tagFilenames: true,
      filenameTagService: 'my tags',
      deleteOriginalArchiveFromDirectory: true,
      deleteOriginalArchiveFromHydrus: true,
      deleteTempFiles: true,
      customServicesToTags: {
        'my tags': [
          'hyextract'
        ]
      },
      moveUnimportedFiles: true,
      unimportedFilesDirectory: path.join(os.homedir(), 'hyextract unimported'),
    }

    if (!fs.existsSync(configPath) || flags.regenconfig) {
      fs.outputJson(configPath, defaultConfig, {spaces: 2})
      this.log(`Config file created: ${configPath}`)
      this.log('Add your API key there and run hyextract again.')
      return;
    }

    const userConfig: UserConfig = await fs.readJSON(path.join(this.config.configDir, 'config.json'))
    const apiUrl = userConfig.hydrusApiUrl.replace(/\/$/, '');
    const apiInfo: HydrusApiInfo = {apiUrl, apiKey: userConfig.hydrusApiKey};

    this.debug(userConfig);
    this.debug(apiInfo);

    try {
      const versionInfo = await apiVersion(apiInfo);
      this.debug(versionInfo.data);
      this.log(`hydrus v${versionInfo.data.hydrus_version}`);
    } catch (error) {
      this.log('Error checking API version');
      this.error(error);
    }

    try {
      const keyInfo = await verifyAccessKey(apiInfo);
      this.debug(keyInfo.data);
      this.log(keyInfo.data.human_description);
    } catch (error) {
      this.log('Error checking API key');
      this.error(error);
    }

    await fs.ensureDir(userConfig.tempDirectory);

    if (userConfig.moveUnimportedFiles) {
      await fs.ensureDir(userConfig.unimportedFilesDirectory);
    }

    const archivesDir = await fs.opendir(userConfig.archivesDirectory);

    for await (const entry of archivesDir) {
      this.debug(entry);
      if (!entry.isFile()) {
        continue;
      }
      const archiveFilePath = path.join(userConfig.archivesDirectory, entry.name);
      this.debug(`archiveFilePath: ${archiveFilePath}`);
      const archiveHash = path.parse(entry.name).name;
      this.debug(`archiveHash: ${archiveHash}`);
      const archiveMetadata = (await lookupMetadata([archiveHash], apiInfo)).data.metadata[0];
      this.debug(archiveMetadata)

      const passwordHexTag = namespaceTagFromFile(archiveMetadata, userConfig.passwordHexNamespace);
      this.debug(`passwordHexTag: ${passwordHexTag}`);
      const passwordTag = namespaceTagFromFile(archiveMetadata, userConfig.passwordNamespace);
      this.debug(`passwordTag: ${passwordTag}`);
      const password = passwordHexTag ? decodeHex(getTagValue(passwordHexTag)) : passwordTag ? getTagValue(passwordTag) : undefined;
      if (password) {
        this.log(`archive password: "${password}"`);
      }

      this.log(`unpacking ${archiveFilePath}`)
      try {
        await this.unpackArchive(archiveFilePath, path.join(userConfig.tempDirectory, archiveHash), password);
      } catch (error) {
        this.warn(error);
        this.warn('An error occurred when attempting to unpack this archive, it will be skipped.');
        continue;
      }

      const newFiles = await FileHound.create()
      .paths(path.join(userConfig.tempDirectory, archiveHash))
      .ignoreHiddenDirectories()
      .ignoreHiddenFiles()
      .find();

      this.debug(newFiles);

      this.log(`Found ${newFiles.length} files`);

      for await (const newFile of newFiles) {
        const newFilePath = newFile;
        this.log(`adding ${newFilePath} to hydrus`);
        try {
          const addInfo = (await addFile(newFilePath, apiInfo)).data;
          this.log(`added file, status: ${HydrusAddFileStatus[addInfo.status]}${addInfo.note.length > 1 ? ' (' + addInfo.note + ')' : ''}`);
          if (addInfo.status === HydrusAddFileStatus.PreviouslyDeleted) {
            continue;
          }
          if (addInfo.status === HydrusAddFileStatus.Failed) {
            throw new Error('Hydrus returned failed status');
          }
          if (userConfig.customServicesToTags) {
            const numCustomTags = Object.values(userConfig.customServicesToTags).map(arr => arr.length).reduce((p, c) => p + c);
            if (numCustomTags > 0) {
              try {
                await addTags({
                  hash: addInfo.hash,
                  service_names_to_tags: userConfig.customServicesToTags
                }, apiInfo);
                this.log(`added ${numCustomTags} custom tags for file`)
              } catch (error) {
                this.warn('error adding custom tags');
                this.warn(error);
              }
            }
          }
          if (userConfig.copyTags) {
            const tagsToAdd = Object.fromEntries(userConfig.tagServices.map(service =>
              [service, serviceTags(archiveMetadata, service)
              .filter(tag => !userConfig.tagBlacklist.includes(tag) && !userConfig.namespaceBlacklist.includes(getNamespace(tag)))]
            ));
            if (userConfig.tagFilenames) {
              const newFileName = path.parse(newFilePath).name;
              tagsToAdd[userConfig.filenameTagService].push(`filename:${newFileName}`);
            }
            const numTags = Object.values(tagsToAdd).map(arr => arr.length).reduce((p, c) => p + c);
            if (numTags > 0) {
              try {
                await addTags({
                  hash: addInfo.hash,
                  service_names_to_tags: tagsToAdd
                }, apiInfo);
                this.log(`added ${numTags} tags for file`);
              } catch (error) {
                this.warn('error adding tags');
                this.warn(error);
              }
            }
          }
          if (userConfig.copyUrls && archiveMetadata.known_urls.length > 0) {
            try {
              await associateUrl({
                hash: addInfo.hash,
                urls_to_add: archiveMetadata.known_urls
              }, apiInfo);
              this.log(`added ${archiveMetadata.known_urls.length} URLs for file`);
            } catch (error) {
              this.warn('error adding URLs');
              this.warn(error);
            }
          }
        } catch (error) {
          this.warn(error);
          if (userConfig.moveUnimportedFiles) {
            await this.handleUnimportedFile(newFilePath, userConfig.tempDirectory, userConfig.unimportedFilesDirectory);
          }
          continue;
        }
      }

      if (userConfig.deleteOriginalArchiveFromDirectory) {
        this.log(`deleting ${archiveFilePath}`);
        await fs.remove(archiveFilePath);
      }
      if (userConfig.deleteOriginalArchiveFromHydrus) {
        this.log(`removing ${archiveHash} from Hydrus`);
        await deleteFiles({hash: archiveHash}, apiInfo);
      }
    }

    if (userConfig.deleteTempFiles) {
      this.log(`clearing temp directory ${userConfig.tempDirectory}`)
      await fs.emptyDir(userConfig.tempDirectory);
    }
  }
}

export = Hyextract
