import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { FlatList, Image, TextInput } from 'react-native';
import FinancialInstitutionPicker from '../src/components/FinancialInstitutionPicker';
import InstitutionLogo from '../src/components/InstitutionLogo';
import useFinancialInstitutions from '../src/hooks/useFinancialInstitutions';

jest.mock('../src/hooks/useFinancialInstitutions', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../src/config/api', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) }));

const other = { id: 321, name: 'Outra instituição', logoUrl: '' };
const institutions = [
  { id: 41, name: 'BRB', logoUrl: '/images/financial-institutions/brb.webp' },
  { id: 97, name: 'Unicred', logoUrl: '/images/financial-institutions/unicred.webp' },
  other,
];
let renderer;
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];

beforeEach(() => {
  useFinancialInstitutions.mockReturnValue({ institutions, loading: false, error: '', retry: jest.fn() });
});
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = undefined; });

test('permite escolher outra instituição em campo obrigatório mesmo sem resultados da busca, usando o ID da API', async () => {
  const onChange = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<FinancialInstitutionPicker required onChange={onChange} />); });
  await act(async () => button('Selecionar instituição financeira').props.onPress());
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('Banco que não está cadastrado'));
  expect(renderer.root.findByType(FlatList).props.data).toEqual([]);
  await act(async () => button('Outra instituição').props.onPress());
  expect(onChange).toHaveBeenCalledWith(321, other);
  await act(async () => renderer.update(<FinancialInstitutionPicker required value={321} selectedInstitution={other} onChange={onChange} />));
  expect(button('Instituição financeira: Outra instituição')).toBeDefined();
});

test('não oferece um ID fictício quando a API não cadastrou a opção genérica', async () => {
  useFinancialInstitutions.mockReturnValue({ institutions: institutions.slice(0, 2), loading: false, error: '', retry: jest.fn() });
  await act(async () => { renderer = TestRenderer.create(<FinancialInstitutionPicker required onChange={jest.fn()} />); });
  await act(async () => button('Selecionar instituição financeira').props.onPress());
  expect(button('Outra instituição')).toBeUndefined();
});

test('outra instituição usa ícone genérico sem buscar imagem na API', async () => {
  await act(async () => { renderer = TestRenderer.create(<InstitutionLogo institution={other} />); });
  expect(renderer.root.findAllByType(Image)).toHaveLength(0);
  expect(renderer.root.findByType('Icon').props.name).toBe('bank');
});
