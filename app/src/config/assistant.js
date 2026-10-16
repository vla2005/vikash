export { assistantEndpoint } from './assistantEndpoint';
export const assistantLimits = {
  attachments: 5,
  fileBytes: 10 * 1024 * 1024,
  totalBytes: 20 * 1024 * 1024,
  textLength: 6000,
  conversations: 50,
  messages: 200,
};
export const assistantTypes = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
