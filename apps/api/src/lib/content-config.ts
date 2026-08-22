export const CONTENT_CONFIG = {
  activities: { fields: ["title", "tag", "image_url", "description", "body"] },
  programs: { fields: ["title", "image_url", "description", "deadline_text"] },
  news: { fields: ["title", "image_url", "excerpt"] },
} as const;
export type CollectionName = keyof typeof CONTENT_CONFIG;
