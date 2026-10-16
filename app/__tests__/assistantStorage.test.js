import { File } from 'expo-file-system';
import { readAssistantHistory, saveAssistantHistory, importAssistantAttachment, assistantAttachmentPart, removeAssistantAttachment } from '../src/services/assistantStorage';
const mockFiles = new Map();
jest.mock('expo-file-system', () => {
  class Directory {
    constructor(...paths) { this.uri = paths.map(p => p.uri || p).join('/'); }
    create() {}
  }
  class MemoryFile {
    constructor(...paths) { this.uri = paths.map(p => p.uri || p).join('/'); }
    get exists() { return mockFiles.has(this.uri); }
    get size() { return mockFiles.get(this.uri)?.length ?? 0; }
    write(content) { mockFiles.set(this.uri, content); }
    async text() { return mockFiles.get(this.uri); }
    copy(target) { mockFiles.set(target.uri, mockFiles.get(this.uri)); }
    delete() { mockFiles.delete(this.uri); }
  }
  return { Directory, File:MemoryFile, Paths:{ document:'file://documents' } };
});
beforeEach(() => mockFiles.clear());
test('history is persistent and isolated by profile without including access tokens', async () => {
  const conversations = [{ id:'c', title:'Meu assunto', messages:[{ id:'m', role:'user', content:'Pergunta', attachments:[] }] }];
  await saveAssistantHistory('a', conversations);
  expect(await readAssistantHistory('a')).toEqual(conversations);
  expect(await readAssistantHistory('b')).toEqual([]);
});
test('copies attachments out of picker cache and reconstructs the URI from the current app directory', async () => {
  new File('cache.pdf').write('12345');
  const file = await importAssistantAttachment('a', { uri:'cache.pdf', name:'Nota.pdf', mimeType:'application/pdf' }, []);
  expect(file).not.toHaveProperty('uri');
  expect(file.size).toBe(5);
  const part = await assistantAttachmentPart('a', file);
  expect(part.uri).toContain('file://documents/assistant/a/attachment-');
  await expect(assistantAttachmentPart('b', file)).rejects.toThrow('não está mais disponível');
  await removeAssistantAttachment('a', file);
  await expect(assistantAttachmentPart('a', file)).rejects.toThrow('não está mais disponível');
});
test('rejects oversized files before copying them and does not silently overwrite malformed history', async () => {
  new File('huge.pdf').write({ length:11 * 1024 * 1024 });
  await expect(importAssistantAttachment('a', { uri:'huge.pdf', name:'Grande.pdf', mimeType:'application/pdf' }, [])).rejects.toThrow('10 MB');
  expect(mockFiles.size).toBe(1);
  new File('file://documents/assistant/a/history.json').write('{broken');
  await expect(readAssistantHistory('a')).rejects.toThrow();
  expect(await new File('file://documents/assistant/a/history.json').text()).toBe('{broken');
});
