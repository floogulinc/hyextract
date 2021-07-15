import {Command, flags} from '@oclif/command'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { HydrusFile, lookupMetadata, HydrusApiInfo, addFile, deleteFiles, addTags, associateUrl, HydrusAddFileStatus } from './hydrus-api'
import { namespaceTagFromFile, serviceTags, getNamespace } from './tag-utils'
import * as _7z from '7zip-min';
import * as util from 'util'
import * as FileHound from 'filehound';

interface UserConfig {
  hydrusApiUrl: string;
  hydrusApiKey: string;
  archivesDirectory: string;
  tempDirectory: string;
  copyTags: boolean;
  copyUrls: boolean;
  tagServices: string[];
  passwordNamespace: string;
  tagBlacklist: string[];
  namespaceBlacklist: string[];
  tagFilenames: boolean;
  filenameTagService: string;
  deleteOriginalArchiveFromDirectory: boolean;
  deleteOriginalArchiveFromHydrus: boolean;
  deleteTempFiles: boolean;
}

const unpackArchive: (pathToArchive: string, whereToUnpack?: string) => Promise<void> = util.promisify(_7z.unpack);
const listArchive: (pathToArchive: string) => Promise<_7z.Result[]> = util.promisify(_7z.list)

class Hyextract extends Command {
  static description = 'Extract archives from Hydrus with tags and URL associations'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),

    regenconfig: flags.boolean({description: 'regenerate the config file'})
  }

  static args = []

  async run() {
    const {args, flags} = this.parse(Hyextract)

    const configPath = path.join(this.config.configDir, 'config.json');

    const defaultConfig: UserConfig = {
      hydrusApiUrl: 'http://localhost:45869',
      hydrusApiKey: 'API_KEY_HERE',
      archivesDirectory: path.join(os.homedir(), 'hyextract archives'),
      tempDirectory: os.tmpdir(),
      copyTags: true,
      copyUrls: true,
      tagServices: ['my tags'],
      passwordNamespace: 'password',
      tagBlacklist: [],
      namespaceBlacklist: ['filename'],
      tagFilenames: true,
      filenameTagService: 'my tags',
      deleteOriginalArchiveFromDirectory: true,
      deleteOriginalArchiveFromHydrus: true,
      deleteTempFiles: true
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

    await fs.ensureDir(userConfig.tempDirectory);

    const archivesDir = await fs.opendir(userConfig.archivesDirectory);

    for await (const entry of archivesDir) {
      if (!entry.isFile()) {
        continue;
      }
      const archiveFilePath = path.join(userConfig.archivesDirectory, entry.name);
      const archiveHash = path.parse(entry.name).name;
      const archiveMetadata = (await lookupMetadata([archiveHash], apiInfo)).data.metadata[0];
      const password = namespaceTagFromFile(archiveMetadata, userConfig.passwordNamespace);

      this.log(`unpacking ${archiveFilePath}`)
      try {
        await unpackArchive(archiveFilePath, path.join(userConfig.tempDirectory, archiveHash));
      } catch (error) {
        this.warn('An error occurred when attempting to unpack this archive, it will be skipped.');
        continue;
      }

      const newFiles = await FileHound.create().paths(path.join(userConfig.tempDirectory, archiveHash)).find();

      this.log(`Found ${newFiles.length} files`);

      for await (const newFile of newFiles) {
        const newFilePath = newFile;
        this.log(`adding ${newFilePath} to hydrus`);
        try {
          const addInfo = (await addFile(newFilePath, apiInfo)).data;
          this.log(`added file, status: ${HydrusAddFileStatus[addInfo.status]}`);
          if (addInfo.status === HydrusAddFileStatus.Failed || addInfo.status === HydrusAddFileStatus.PreviouslyDeleted) {
            continue;
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
            await addTags({
              hash: addInfo.hash,
              service_names_to_tags: tagsToAdd
            }, apiInfo);
            this.log('added tags for file');
          }
          if (userConfig.copyUrls) {
            await associateUrl({
              hash: addInfo.hash,
              urls_to_add: archiveMetadata.known_urls
            }, apiInfo);
            this.log('added URLs for file');
          }
        } catch (error) {
          this.warn(error);
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
