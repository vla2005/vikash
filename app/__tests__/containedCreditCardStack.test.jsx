import { MotionCard } from '../src/components/CardStackMotion';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Animated, AppState, Platform, RefreshControl, StyleSheet, Text } from 'react-native';
import AccountsScreen from '../src/screens/AccountsScreen';
import HomeCreditCards from '../src/components/HomeCreditCards';
import ScrollableCreditCardStack from '../src/components/ScrollableCreditCardStack';
import DockScrollView from '../src/components/silver/DockScrollView';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/components/InstitutionLogo', () => 'InstitutionLogo');
jest.mock('../src/hooks/useReducedMotion', () => () => true);
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path' }));
const cards = Array.from({ length: 10 }, (_, index) => ({ uuid: `card-${index}`, lastFourDigits: 1000 + index,
  financialInstitution: { name: `Banco ${index}` }, creditLimit: 3000, availableLimit: 2500 - index * 100,
  currentInvoice: { uuid: `invoice-${index}`, total: 500 + index * 100, dueDate: '2026-10-20', status: 'OPEN' } }));
let renderer;
const originalOS = Platform.OS;
const id = testID => renderer.root.findAll(node => node.props.testID === testID)[0];
const button = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const textIn = node => node.findAllByType(Text).map(item => item.props.children).flat().join(' ');
const opacity = testID => { const value = StyleSheet.flatten(id(testID).props.style).opacity; return typeof value === 'number' ? value : value.__getValue(); };
const openCards = async (props = {}) => {
  await act(async () => { renderer = TestRenderer.create(<AccountsScreen accounts={[]} cards={cards} {...props} />); });
  await act(async () => button('Mostrar cartões').props.onPress());
};
beforeEach(() => jest.useFakeTimers());
afterEach(() => { act(() => renderer?.unmount()); renderer = null; Platform.OS = originalOS; jest.restoreAllMocks(); jest.useRealTimers(); });

test('three or ten cards occupy the original stack height; every card is reachable and details remain outside it', async () => {
  await openCards({ cards: cards.slice(0, 3) });
  const height = StyleSheet.flatten(id('credit-card-stack').props.style).height;
  await act(async () => renderer.update(<AccountsScreen accounts={[]} cards={cards} />));
  expect(StyleSheet.flatten(id('credit-card-stack').props.style).height).toBe(height);
  expect(id('credit-card-stack').findAllByType(ScrollableCreditCardStack)).toHaveLength(1);
  expect(id('credit-card-stack').findAllByProps({ testID: 'credit-card-stack-details' })).toHaveLength(0);
  for (const card of cards) expect(button(`Selecionar cartão Cartão final ${card.lastFourDigits}`)).toBeTruthy();
  expect(id('credit-card-stack-scroller').props.nestedScrollEnabled).toBe(true);
  expect(id('credit-card-stack-scroller').props.showsVerticalScrollIndicator).toBe(false);
  expect(id('credit-card-stack-scroller').props.bounces).toBe(false);
  expect(StyleSheet.flatten(id('credit-card-stack-scroll-region').props.style).overflow).toBe('hidden');
});

test('touch and momentum lock only the outer scroller, including the time between drag-end and momentum-begin', async () => {
  await openCards();
  const page = () => renderer.root.findByType(DockScrollView);
  expect(page().props.scrollEnabled).toBe(true);
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchStartCapture());
  expect(page().props.scrollEnabled).toBe(false);
  expect(renderer.root.findByType(RefreshControl).props.enabled).toBe(false);
  await act(async () => id('credit-card-stack-scroller').props.onScrollBeginDrag());
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchCancel());
  await act(async () => jest.advanceTimersByTime(200));
  expect(page().props.scrollEnabled).toBe(false);
  await act(async () => id('credit-card-stack-scroller').props.onScrollEndDrag());
  await act(async () => id('credit-card-stack-scroller').props.onMomentumScrollBegin());
  await act(async () => jest.advanceTimersByTime(200));
  expect(page().props.scrollEnabled).toBe(false);
  await act(async () => id('credit-card-stack-scroller').props.onMomentumScrollEnd());
  expect(page().props.scrollEnabled).toBe(true);
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchStartCapture());
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchEndCapture());
  await act(async () => jest.advanceTimersByTime(100));
  expect(page().props.scrollEnabled).toBe(true);
});

test('cancellation and leaving the cards tab restore normal page scrolling', async () => {
  await openCards();
  const page = () => renderer.root.findByType(DockScrollView);
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchStartCapture());
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchCancel());
  await act(async () => jest.advanceTimersByTime(100));
  expect(page().props.scrollEnabled).toBe(true);
  expect(renderer.root.findByType(RefreshControl).props.enabled).toBe(true);
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchStartCapture());
  await act(async () => button('Mostrar contas').props.onPress());
  expect(page().props.scrollEnabled).toBe(true);
  expect(renderer.root.findAllByType(ScrollableCreditCardStack)).toHaveLength(0);
});

test('selection and dot navigation update only the existing selected data and open the correct invoice', async () => {
  const open = jest.fn();
  await openCards({ onOpenCard: open });
  await act(async () => button('Selecionar cartão Cartão final 1009').props.onPress());
  expect(open).not.toHaveBeenCalled();
  expect(textIn(id('credit-card-stack-details'))).toContain('Cartão final 1009');
  expect(textIn(id('credit-card-stack-details'))).toContain('1.400,00');
  expect(textIn(id('credit-card-stack-details'))).toContain('1.600,00');
  await act(async () => button('Ver fatura de Cartão final 1009').props.onPress());
  expect(open).toHaveBeenCalledWith('card-9', 'invoice-9');
  await act(async () => button('Mostrar cartão Cartão final 1000').props.onPress());
  expect(button('Selecionar cartão Cartão final 1000').props.accessibilityState.selected).toBe(true);
  expect(textIn(id('credit-card-stack-details'))).toContain('Cartão final 1000');
});

test('web contains scroll chaining and fades identify only directions that have more cards', async () => {
  Platform.OS = 'web';
  await openCards({ cards: cards.slice(0, 3) });
  const scroll = id('credit-card-stack-scroller');
  expect(StyleSheet.flatten(scroll.props.style).overscrollBehaviorY).toBe('contain');
  expect(opacity('credit-card-stack-top-fade')).toBe(1);
  expect(opacity('credit-card-stack-bottom-fade')).toBe(0);
  await act(async () => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } }));
  await act(async () => renderer.update(<AccountsScreen accounts={[]} cards={cards.slice(0, 3)} />));
  expect(opacity('credit-card-stack-top-fade')).toBe(0);
  expect(opacity('credit-card-stack-bottom-fade')).toBe(1);
  await act(async () => id('credit-card-stack-scroller').props.onScroll({ nativeEvent: { contentOffset: { y: 46 } } }));
  await act(async () => renderer.update(<AccountsScreen accounts={[]} cards={cards.slice(0, 3)} />));
  expect(opacity('credit-card-stack-top-fade')).toBe(1);
  expect(opacity('credit-card-stack-bottom-fade')).toBe(1);
  expect(button('Selecionar cartão Cartão final 1000').props.accessibilityState.selected).toBe(true);
});

test('native scrolling animates without JS listeners and the optional legacy renderer remains isolated', async () => {
  const event = jest.spyOn(Animated, 'event');
  const listener = jest.spyOn(Animated.Value.prototype, 'addListener');
  await openCards();
  expect(event).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
  await act(async () => renderer.update(<HomeCreditCards cards={cards} />));
  expect(renderer.root.findAllByType(ScrollableCreditCardStack)).toHaveLength(0);
});

test('one card does not scroll or show overflow shadows', async () => {
  await openCards({ cards: cards.slice(0, 1) });
  expect(id('credit-card-stack-scroller').props.scrollEnabled).toBe(false);
  expect(id('credit-card-stack-scroll-region').props.onTouchStartCapture).toBeUndefined();
  expect(opacity('credit-card-stack-top-fade')).toBe(0);
  expect(opacity('credit-card-stack-bottom-fade')).toBe(0);
});


test('background interruption releases the outer page even during an unfinished drag', async () => {
  let changeState;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, callback) => { changeState = callback; return { remove }; });
  await openCards();
  await act(async () => id('credit-card-stack-scroll-region').props.onTouchStartCapture());
  await act(async () => id('credit-card-stack-scroller').props.onScrollBeginDrag());
  expect(renderer.root.findByType(DockScrollView).props.scrollEnabled).toBe(false);
  await act(async () => changeState('background'));
  expect(renderer.root.findByType(DockScrollView).props.scrollEnabled).toBe(true);
  expect(renderer.root.findByType(RefreshControl).props.enabled).toBe(true);
  await act(async () => button('Mostrar contas').props.onPress());
  expect(remove).toHaveBeenCalledTimes(1);
});

test('every selection promotes the chosen card to the front slot at full scale and recedes the old front', async () => {
  await openCards();
  for (const index of [9, 4, 0]) {
    await act(async () => button(`Mostrar cartão Cartão final ${1000 + index}`).props.onPress());
    // The Jest UI-thread mock samples animated styles during React render.
    await act(async () => renderer.update(<AccountsScreen accounts={[]} cards={cards} />));
    const layers = renderer.root.findAllByType(MotionCard);
    expect(layers).toHaveLength(10);
    const selected = layers.filter(layer => layer.props.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.index).toBe(9);
    expect(selected[0].props.children.props.accessibilityLabel).toBe(`Selecionar cartão Cartão final ${1000 + index}`);
    const selectedStyle = StyleSheet.flatten(selected[0].children[0].props.style);
    expect(selectedStyle.transform[1].scale).toBe(1);
    for (const layer of layers.filter(item => !item.props.selected)) {
      const style = StyleSheet.flatten(layer.children[0].props.style);
      expect(style.transform[1].scale).toBeLessThan(1);
      expect(style.opacity).toBeLessThan(1);
      expect(style.zIndex).toBeLessThan(selectedStyle.zIndex);
    }
  }
});

test('selection and repeated taps animate only the stack without scheduling a page-focus scroll', async () => {
  await openCards();
  const frame = jest.spyOn(global, 'requestAnimationFrame');
  expect(renderer.root.findByType(HomeCreditCards).props.onCardSelected).toBeUndefined();
  await act(async () => button('Mostrar cartão Cartão final 1009').props.onPress());
  await act(async () => jest.advanceTimersByTime(32));
  expect(textIn(id('credit-card-stack-details'))).toContain('Cartão final 1009');
  expect(frame).not.toHaveBeenCalled();
  await act(async () => button('Mostrar cartão Cartão final 1009').props.onPress());
  expect(frame).not.toHaveBeenCalled();
  expect(renderer.root.findByType(DockScrollView).props.scrollEnabled).toBe(true);
});