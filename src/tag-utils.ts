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

export function tagsObjectFromFile(file: HydrusFile): ServiceNamesToStatusesToTags {
  return file.service_names_to_statuses_to_display_tags ?? file.service_names_to_statuses_to_tags;
}

function allKnownTags(serviceNamesTostatusesToTags: ServiceNamesToStatusesToTags) {
  if (serviceNamesTostatusesToTags
    && 'all known tags' in serviceNamesTostatusesToTags
    && '0' in serviceNamesTostatusesToTags['all known tags']) {
    return serviceNamesTostatusesToTags['all known tags']['0'];
  }
  return [];
}

export function allTagsFromFile(file: HydrusFile): string[] {
  return allKnownTags(tagsObjectFromFile(file));
}

export function namespaceTagFromFile(file: HydrusFile, namespace: string): string | undefined {
  return allTagsFromFile(file).find(a => getNamespace(a) === namespace);
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
  return tagsObjectFromFile(file)?.[service]?.['0'] ?? [];
}
