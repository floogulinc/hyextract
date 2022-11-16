import axios from 'axios'

export interface ServiceNamesToStatusesToTags {
  [service: string]: {
    [status: string]: string[];
  };
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
  service_names_to_statuses_to_tags: ServiceNamesToStatusesToTags;
  service_names_to_statuses_to_display_tags: ServiceNamesToStatusesToTags;  // Hydrus 419+
  is_inbox: boolean;
  is_local: boolean;
  is_trashed: boolean;
}

export interface HydrusFileList {
  [fileId: number]: HydrusFile;
}

export type HydrusAddTagsRequest = ({ hash: string } | { hashes: string[] }) & (
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

export async function deleteFiles(args: { hash: string } | { hashes: string[] }, {apiUrl, apiKey}: HydrusApiInfo) {
  return axios.post(`${apiUrl}/add_files/delete_files`, args, {
    headers: {
      'Hydrus-Client-API-Access-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

export async function addTags(args: HydrusAddTagsRequest, {apiUrl, apiKey}: HydrusApiInfo) {
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
