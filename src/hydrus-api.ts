import axios from 'axios'

export enum HydrusServiceType {
  TAG_REPOSITORY = 0,
  FILE_REPOSITORY = 1,
  LOCAL_FILE_DOMAIN = 2,
  MESSAGE_DEPOT = 3,
  LOCAL_TAG = 5,
  LOCAL_RATING_NUMERICAL = 6,
  LOCAL_RATING_LIKE = 7,
  RATING_NUMERICAL_REPOSITORY = 8,
  RATING_LIKE_REPOSITORY = 9,
  COMBINED_TAG = 10,
  COMBINED_FILE = 11,
  LOCAL_BOORU = 12,
  IPFS = 13,
  LOCAL_FILE_TRASH_DOMAIN = 14,
  COMBINED_LOCAL_FILE = 15,
  TEST_SERVICE = 16,
  LOCAL_NOTES = 17,
  CLIENT_API_SERVICE = 18,
  COMBINED_DELETED_FILE = 19,
  LOCAL_FILE_UPDATE_DOMAIN = 20,
  COMBINED_LOCAL_MEDIA = 21,
  SERVER_ADMIN = 99,
  NULL_SERVICE = 100,
}

export interface StatusesToTags {
  [status: string]: string[];
}

export interface ServiceNamesToStatusesToTags {
  [service: string]: StatusesToTags;
}

export interface FileFileServices {
  [service_id: string]: {
    time_imported?: number;
    time_deleted?: number;
  };
}

export type HydrusTagServiceType =
  | HydrusServiceType.TAG_REPOSITORY
  | HydrusServiceType.LOCAL_TAG
  | HydrusServiceType.COMBINED_TAG;

export interface HydrusTagService {
  name: string;
  type: HydrusTagServiceType;
  type_pretty: string;
  storage_tags: StatusesToTags;
  display_tags: StatusesToTags;
}

export interface HydrusFile {
  file_id: number;
  hash: string;
  size: number;
  mime: string;
  ext: string;
  width: number;
  height: number;
  has_audio: boolean;
  known_urls: string[];
  duration?: number | null;
  num_frames?: number | null;
  num_words?: number | null;
  file_services: {
    current?: FileFileServices;
    deleted?: FileFileServices;
  };
  time_modified: number;

  tags: {
    [serviceKey: string]: HydrusTagService;
  };

  is_inbox: boolean;
  is_local: boolean;
  is_trashed: boolean;
  notes: {
    [name: string]: string;
  };
}

export interface HydrusFileList {
  [fileId: number]: HydrusFile;
}

export interface ServiceNamesOrKeysToTags {
  [serviceNameOrKey: string]: string[]
}

export interface ServiceNamesOrKeysToActionsToTags {
  [serviceNameOrKey: string] : {
    [action: string]: string[]
  }
}

export type HydrusAddTagsRequest = ({ hash: string } | { hashes: string[] }) & (
  {
    service_keys_to_tags: ServiceNamesOrKeysToTags,
  } | {
    service_keys_to_actions_to_tags: ServiceNamesOrKeysToActionsToTags
  })

export type HydrusAddTagsRequestLegacy = ({ hash: string } | { hashes: string[] }) & (
  {
    service_names_to_tags?: {
      [service: string]: string[];
    };
  } | {
    service_names_to_actions_to_tags?: {
      [service: string]: {
        [actions: string]: string[];
      };
    };
  })

export type HydrusAssociateUrlsRequest = ({ hash: string } | { hashes: string[] }) & {
  url_to_add?: string;
  urls_to_add?: string[];
  url_to_delete?: string;
  urls_to_delete?: string[];
}

export interface HydrusApiInfo {
  apiUrl: string;
  apiKey: string;
}

export async function lookupMetadata(hashes: string[], {apiUrl, apiKey}: HydrusApiInfo) {
  return axios.get<{ metadata: HydrusFile[] }>(`${apiUrl}/get_files/file_metadata`, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey
    },
    params: {
      hashes: JSON.stringify(hashes),
      hide_service_names_tags: false
    }
  })
}

export enum HydrusAddFileStatus {
  Success = 1,
  AlreadyInDatabase = 2,
  PreviouslyDeleted = 3,
  Failed = 4,
  Vetoed = 7
}

export interface HydrusAddFileResponse {
  status: HydrusAddFileStatus;
  hash: string;
  note: string;
}

export async function addFile(path: string, {apiUrl, apiKey}: HydrusApiInfo) {
  return axios.post<HydrusAddFileResponse>(`${apiUrl}/add_files/add_file`, {
    path
  }, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

export async function deleteFiles(args: {
    hash?: string;
    hashes?: string[];
    file_id?: number;
    file_ids?: number[];
    file_service_name?: string;
    file_service_key?: string;
    reason?: string;
  }, {apiUrl, apiKey}: HydrusApiInfo) {
  return axios.post(`${apiUrl}/add_files/delete_files`, args, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

export async function addTags(args: HydrusAddTagsRequestLegacy, {apiUrl, apiKey}: HydrusApiInfo) {
  return axios.post(`${apiUrl}/add_tags/add_tags`, args, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

export async function associateUrl(args: HydrusAssociateUrlsRequest, {apiUrl, apiKey}: HydrusApiInfo) {
  return axios.post(`${apiUrl}/add_urls/associate_url`, args, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

export async function verifyAccessKey({apiUrl, apiKey}: HydrusApiInfo) {
  return axios.get<{ basic_permissions: number[]; human_description: string }>(`${apiUrl}/verify_access_key`, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey
    }
  })
}

export async function apiVersion({apiUrl}: HydrusApiInfo) {
  return axios.get<{ version: number; hydrus_version: number }>(`${apiUrl}/api_version`);
}
