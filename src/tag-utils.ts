import {HydrusFile, ServiceNamesToStatusesToTags} from './hydrus-api';

export function getNamespace(tag: string): string {
  if (!tag?.includes(':')) {
    return '';
  }
  if (tag.startsWith('-')) {
    tag = tag.substring(1);
  }
  return tag.split(':')[0].toLowerCase();
}

export function getNamespaceNoSpace(tag: string): string {
  if (!tag?.includes(':')) {
    return '';
  }
  if (tag.startsWith('-')) {
    tag = tag.substring(1);
  }
  return tag.split(':')[0].replace(/\s+/g, '-').toLowerCase();
}

export function allTagsFromFile(file: HydrusFile): string[] {
  return file.tags['616c6c206b6e6f776e2074616773']?.display_tags?.[0];
}

export function namespaceTagFromFile(file: HydrusFile, namespace: string): string | undefined {
  return allTagsFromFile(file)?.find(a => getNamespace(a) === namespace);
}

export function getTagValue(tag: string) {
  if (!tag) {
    return tag;
  }
  if (tag.startsWith('-')) {
    tag = tag.substring(1);
  }
  if (!tag.includes(':')) {
    return tag;
  }
  return tag.split(':')[1].toLowerCase();
}

export function serviceTags(file: HydrusFile, service: string) {
  // return file.service_names_to_statuses_to_tags?.[service]?.['0'] ?? [];
  return getTagService(file, service)?.storage_tags?.['0'] ?? [];
}

export function getTagService(file: HydrusFile, serviceName: string) {
  const result = Object.entries(file.tags).find(([serviceKey, service]) => service.name === serviceName);
  if (!result) {
    return undefined;
  }
  const [serviceKey, service] = result;
  return {serviceKey, ...service};
}
