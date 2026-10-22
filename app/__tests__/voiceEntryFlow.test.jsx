import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';
import VoiceEntryRoot from '../src/screens/VoiceEntryRoot';
import {
  previewVoiceEntry,
  confirmVoiceEntry,
  storePendingVoiceEntry,
  clearPendingVoiceEntry,
  loadPendingVoiceEntry,
  loadVoiceConsent,
  acceptVoiceConsent,
} from '../src/services/voiceEntry';
const mockSession = {
  ready: true,
  session: { accessToken: 'token', user: { uuid: 'user' } },
  retryRestore: jest.fn(),
};
const mockVoice = {
  phase: 'review',
  text: 'Gastei 35 reais com almoço hoje no Pix da conta Inter',
  cancel: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};
const mockNative = {
  newRequestId: jest.fn(async () => 'request-1'),
  finish: jest.fn(),
  openApp: jest.fn(),
};
jest.mock('../src/contexts/OnboardingContext', () => ({
  OnboardingProvider: ({ children }) => children,
  useOnboarding: () => mockSession,
}));
jest.mock('../src/hooks/useAppFonts', () => () => true);
jest.mock('../src/hooks/useVoiceTranscription', () => () => mockVoice);
jest.mock('../src/services/voiceEntryNative', () => ({
  voiceEntryNative: () => mockNative,
}));
jest.mock('../src/services/accounts', () => ({
  fetchAccounts: jest.fn(async () => [
    { uuid: 'account', description: 'Inter' },
  ]),
}));
jest.mock('../src/services/creditCards', () => ({
  fetchCreditCards: jest.fn(async () => []),
}));
jest.mock('../src/services/categories', () => ({
  fetchCategories: jest.fn(async () => ({
    defaultCategories: [{ name: 'Alimentação' }],
    customCategories: [],
  })),
}));
jest.mock('../src/services/voiceEntry', () => ({
  previewVoiceEntry: jest.fn(),
  confirmVoiceEntry: jest.fn(),
  loadPendingVoiceEntry: jest.fn(),
  storePendingVoiceEntry: jest.fn(),
  clearPendingVoiceEntry: jest.fn(),
  loadVoiceConsent: jest.fn(),
  acceptVoiceConsent: jest.fn(),
}));
jest.mock('../src/components/SelectionField', () => 'SelectionField');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 24, bottom: 20 }),
}));
jest.mock('../src/components/Icon', () => 'Icon');
let tree;
const response = {
  description: 'Almoço',
  amount: '35.00',
  type: 'EXPENSE',
  paymentMethod: 'PIX',
  occurredAt: '2026-10-21T12:00:00',
  accountUuid: 'account',
  installmentCount: 1,
  defaultCategoryName: 'Alimentação',
  missingFields: [],
};
const button = title =>
  tree.root
    .findAllByProps({ accessibilityLabel: title })
    .find(node => typeof node.props.onPress === 'function');
const press = async title => {
  await act(async () => button(title).props.onPress());
};
beforeEach(() => {
  jest.clearAllMocks();
  mockVoice.phase = 'review';
  mockVoice.text = 'Gastei 35 reais com almoço hoje no Pix da conta Inter';
  AccessibilityInfo.isReduceMotionEnabled = jest.fn(async () => true);
  loadPendingVoiceEntry.mockResolvedValue(null);
  loadVoiceConsent.mockResolvedValue(false);
  acceptVoiceConsent.mockResolvedValue(null);
  previewVoiceEntry.mockResolvedValue(response);
  confirmVoiceEntry.mockResolvedValue(null);
  storePendingVoiceEntry.mockResolvedValue(null);
  clearPendingVoiceEntry.mockResolvedValue(null);
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  tree = null;
});
async function mount() {
  await act(async () => {
    tree = renderer.create(<VoiceEntryRoot />);
  });
}
async function review() {
  await mount();
  await press('Concordar e começar');
}
test('never analyzes before consent or saves before explicit confirmation', async () => {
  await mount();
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
  await press('Concordar e começar');
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
  expect(button('Confirmar').props.disabled).toBe(false);
  await press('Confirmar');
  expect(previewVoiceEntry).toHaveBeenCalledTimes(1);
  expect(storePendingVoiceEntry).toHaveBeenCalledTimes(1);
  expect(confirmVoiceEntry.mock.calls[0][0].analysis.amount).toBe('35.00');
  expect(clearPendingVoiceEntry).toHaveBeenCalledWith('user');
});
test('double confirmation shares one request and save', async () => {
  await review();
  let release;
  confirmVoiceEntry.mockImplementation(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  const action = button('Confirmar').props.onPress;
  await act(async () => {
    action();
    action();
  });
  expect(previewVoiceEntry).toHaveBeenCalledTimes(1);
  expect(confirmVoiceEntry).toHaveBeenCalledTimes(1);
  await act(async () => release());
});
test('lost response retries exactly the same payload', async () => {
  await review();
  confirmVoiceEntry.mockRejectedValueOnce(new Error('Conexão interrompida'));
  await press('Confirmar');
  const first = confirmVoiceEntry.mock.calls[0][0];
  await press('Verificar registro');
  expect(confirmVoiceEntry.mock.calls[1][0]).toEqual(first);
  expect(mockNative.newRequestId).toHaveBeenCalledTimes(1);
  expect(previewVoiceEntry).toHaveBeenCalledTimes(1);
});
test('restores an uncertain previous operation without listening or re-analyzing', async () => {
  loadPendingVoiceEntry.mockResolvedValue({
    requestId: 'previous',
    transcription: 'Almoço',
    analysis: response,
  });
  await mount();
  await press('Verificar registro');
  expect(confirmVoiceEntry.mock.calls[0][0].requestId).toBe('previous');
  expect(previewVoiceEntry).not.toHaveBeenCalled();
});
test('analysis failure preserves transcript for retry', async () => {
  previewVoiceEntry.mockRejectedValueOnce(new Error('Sem internet'));
  await review();
  await press('Confirmar');
  expect(button('Confirmar')).toBeDefined();
  expect(previewVoiceEntry).toHaveBeenCalledTimes(1);
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});

test('previous informed consent starts capture directly, while still requiring confirmation', async () => {
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  expect(button('Confirmar')).toBeDefined();
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});

test('normal flow shows transcription and exactly the three visible actions', async () => {
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  expect(button('Confirmar')).toBeDefined();
  expect(button('Regravar')).toBeDefined();
  expect(button('Abrir app')).toBeDefined();
  expect(button('Analisar')).toBeUndefined();
  expect(button('Editar')).toBeUndefined();
  expect(button('Cancelar registro')).toBeUndefined();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});
test('capture keeps only the orb until the speech service completes', async () => {
  loadVoiceConsent.mockResolvedValue(true);
  mockVoice.phase = 'listening';
  await mount();
  expect(button('Confirmar')).toBeUndefined();
  expect(button('Regravar')).toBeUndefined();
  expect(button('Abrir app')).toBeUndefined();
  expect(previewVoiceEntry).not.toHaveBeenCalled();
});
test('incomplete analysis cannot be confirmed or persisted', async () => {
  previewVoiceEntry.mockResolvedValue({
    ...response,
    accountUuid: null,
    missingFields: ['accountUuid'],
  });
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  await press('Confirmar');
  expect(previewVoiceEntry).toHaveBeenCalledTimes(1);
  expect(storePendingVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});
test('opening the app cancels capture without saving', async () => {
  await review();
  await press('Abrir app');
  expect(mockVoice.cancel).toHaveBeenCalled();
  expect(mockNative.openApp).toHaveBeenCalledTimes(1);
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});
test('re-recording discards an unfinished analysis without saving stale data', async () => {
  let resolve;
  previewVoiceEntry.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  let confirmation;
  await act(async () => {
    confirmation = button('Confirmar').props.onPress();
  });
  expect(previewVoiceEntry).toHaveBeenCalledTimes(1);
  expect(button('Confirmar').props.disabled).toBe(true);
  mockVoice.phase = 'listening';
  await press('Regravar');
  await act(async () => {
    resolve(response);
    await confirmation;
  });
  expect(button('Confirmar')).toBeUndefined();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});

test('arbitrary speech makes no analysis request until Confirmar is pressed', async () => {
  mockVoice.text = 'Uma frase aleatória sobre o céu';
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  expect(button('Confirmar').props.disabled).toBe(false);
  expect(button('Confirmar').props.accessibilityState.busy).toBe(false);
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});
test('re-recording before confirmation never invokes Gemini', async () => {
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  mockVoice.phase = 'listening';
  await press('Regravar');
  expect(previewVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});
test('opening the app during analysis prevents a late response from being saved', async () => {
  let resolve;
  previewVoiceEntry.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  loadVoiceConsent.mockResolvedValue(true);
  await mount();
  let confirmation;
  await act(async () => {
    confirmation = button('Confirmar').props.onPress();
  });
  await press('Abrir app');
  await act(async () => {
    resolve(response);
    await confirmation;
  });
  expect(mockNative.openApp).toHaveBeenCalledTimes(1);
  expect(storePendingVoiceEntry).not.toHaveBeenCalled();
  expect(confirmVoiceEntry).not.toHaveBeenCalled();
});
