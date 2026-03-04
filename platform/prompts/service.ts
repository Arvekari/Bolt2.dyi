export type PromptTemplateRecord = {
  id: string;
  name: string;
  version: number;
  scope: 'global' | 'user';
  content: string;
};
