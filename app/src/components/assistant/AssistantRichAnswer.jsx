import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PieChart from '../../shared/components/reacticx/charts/pie-chart';
import BarChart from '../../shared/components/reacticx/charts/bar-chart';
import InstitutionLogo from '../InstitutionLogo';
import Icon from '../Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../../theme';
import { amberAccent } from '../../theme/silver';
import { normalizeAssistantPresentation } from '../../utils/assistantPresentation';
import logos from '../../assets/institutions';
import AssistantReplyText from './AssistantReplyText';
const PAGE = 5;
const normalize = text =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const institutionFor = label => {
  const normalized = normalize(label),
    aliases = {
      'mercado pago': 'mercado-pago',
      'banco inter': 'inter',
      'itau unibanco': 'itau',
      'banco do brasil': 'bb',
    };
  const key = aliases[normalized] || normalized;
  return Object.prototype.hasOwnProperty.call(logos, key)
    ? { logoUrl: `/assets/institutions/${key}.webp`, name: label }
    : null;
};
const FinancialBlock = memo(function FinancialBlock({ block }) {
  const { categoryColors } = useTheme();
  const [selected, setSelected] = useState(-1),
    [page, setPage] = useState(0);
  const data = useMemo(
    () =>
      block.items.map((item, index) => ({
        label: item.label,
        value: Number(item.value),
        color:
          categoryColors[index % categoryColors.length]?.foreground ||
          amberAccent.dark,
      })),
    [block.items, categoryColors],
  );
  if (block.type === 'metric')
    return (
      <View testID="assistant-metric" style={s.metric}>
        <Text style={s.eyebrow}>{block.title}</Text>
        <Text selectable style={s.bigValue}>
          {block.value}
        </Text>
        {!!block.caption && <Text style={s.caption}>{block.caption}</Text>}
      </View>
    );
  const isChart = ['pie', 'bar'].includes(block.type),
    pages = Math.ceil(block.items.length / PAGE);
  const select = index => {
    setSelected(previous => (previous === index ? -1 : index));
    setPage(Math.floor(index / PAGE));
  };
  const choice = block.items[selected];
  return (
    <View testID={`assistant-${block.type}`} style={s.visual}>
      <View style={s.visualHeader}>
        <Icon
          name={block.type === 'pie' ? 'categories' : 'statement'}
          size={20}
          color={amberAccent.dark}
        />
        <Text accessibilityRole="header" style={s.title}>
          {block.title}
        </Text>
      </View>
      {!!block.caption && <Text style={s.caption}>{block.caption}</Text>}
      {isChart && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={block.type === 'pie' ? s.pie : s.bar}
        >
          {block.type === 'pie' ? (
            <>
              <PieChart.Root
                data={data}
                innerRadius={0.73}
                activeOffset={8}
                padAngle={1.6}
                selectedIndex={selected}
                onSelectionChange={index => {
                  setSelected(index);
                  if (index >= 0) setPage(Math.floor(index / PAGE));
                }}
              >
                <PieChart.Slices inactiveOpacity={0.3} />
              </PieChart.Root>
              <View pointerEvents="none" style={s.pieCenter}>
                <Text numberOfLines={2} style={s.centerLabel}>
                  {choice?.label || 'Distribuição'}
                </Text>
                <Text
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  style={s.centerValue}
                >
                  {choice?.formattedValue || 'Toque para explorar'}
                </Text>
              </View>
            </>
          ) : (
            <BarChart.Root
              data={data}
              selectedIndex={selected}
              onSelectionChange={index => {
                setSelected(index);
                if (index >= 0) setPage(Math.floor(index / PAGE));
              }}
              style={s.barChart}
              leftInset={0}
              bottomInset={36}
              topInset={16}
              growDuration={700}
              barRatio={0.52}
            >
              <BarChart.Grid color="rgba(255,255,255,.07)" />
              <BarChart.Bars color={amberAccent.dark} radius={7} />
              <BarChart.XAxis
                style={s.axis}
                activeStyle={s.axisActive}
                format={point =>
                  point.label.length > 10
                    ? `${point.label.slice(0, 8)}…`
                    : point.label
                }
              />
            </BarChart.Root>
          )}
        </View>
      )}
      {block.items.slice(page * PAGE, (page + 1) * PAGE).map((item, offset) => {
        const index = page * PAGE + offset,
          institution = institutionFor(item.label),
          active = selected === index;
        return (
          <Pressable
            key={index}
            accessibilityRole={isChart ? 'button' : 'text'}
            disabled={!isChart}
            accessibilityState={isChart ? { selected: active } : undefined}
            accessibilityLabel={`${item.label}, ${item.formattedValue}${
              active ? ', selecionado' : ''
            }`}
            onPress={() => select(index)}
            style={({ pressed, hovered, focused }) => [
              s.row,
              active && s.selected,
              (pressed || hovered || focused) && isChart && s.hover,
            ]}
          >
            {institution ? (
              <InstitutionLogo institution={institution} size={32} />
            ) : (
              <View style={[s.dot, { backgroundColor: data[index].color }]} />
            )}
            <Text style={[s.rowName, active && s.selectedText]}>
              {item.label}
            </Text>
            <Text
              selectable={!isChart}
              style={[s.rowValue, active && s.selectedText]}
            >
              {item.formattedValue}
            </Text>
          </Pressable>
        );
      })}
      {pages > 1 && (
        <View style={s.pagination}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Itens anteriores"
            disabled={page === 0}
            onPress={() => setPage(p => p - 1)}
            style={[s.pageButton, page === 0 && s.disabled]}
          >
            <Icon name="back" color="#F4F4F3" size={18} />
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={s.caption}>
            {page + 1} de {pages}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximos itens"
            disabled={page === pages - 1}
            onPress={() => setPage(p => p + 1)}
            style={[s.pageButton, page === pages - 1 && s.disabled]}
          >
            <Icon name="chevron" color="#F4F4F3" size={18} />
          </Pressable>
        </View>
      )}
    </View>
  );
});
export default memo(function AssistantRichAnswer({ content, presentation, animate = false, active = true, messageId, onRevealComplete }) {
  const visual = useMemo(
    () => normalizeAssistantPresentation(presentation),
    [presentation],
  );
  return (
    <View testID="assistant-rich-answer" style={s.root}>
      {visual?.blocks.map((block, index) => (
        <FinancialBlock key={index} block={block} />
      ))}
      <AssistantReplyText content={content} animate={animate} active={active} messageId={messageId} onComplete={onRevealComplete} />
      {visual && (
        <View style={s.source}>
          <Icon name="sparkles" size={15} color={amberAccent.dark} />
          <View style={s.sourceCopy}>
            <Text style={s.sourceText}>
              Dados dos seus registros no ViKash
              {visual.queriedAt
                ? ` · consulta em ${new Date(visual.queriedAt).toLocaleString(
                    'pt-BR',
                    {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}`
                : ''}
              .
            </Text>
            {visual.limited && (
              <Text style={s.sourceText}>
                A lista atingiu o limite da consulta e pode não mostrar todos os
                registros.
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
});
const s = StyleSheet.create({
  root: { width: '100%', gap: 22 },
  metric: { gap: 9, paddingTop: 4, paddingBottom: 6 },
  eyebrow: {
    fontWeight: '500',
    fontFamily: fontFamilyMedium,
    fontSize: 13,
    color: '#B0B0B4',
  },
  bigValue: {
    fontWeight: '700',
    fontFamily: fontFamilyBold,
    fontSize: 34,
    lineHeight: 44,
    letterSpacing: -1,
    color: '#F4F4F3',
    fontVariant: ['tabular-nums'],
  },
  visual: { gap: 10 },
  visualHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: {
    fontWeight: '700',
    fontFamily: fontFamilyBold,
    fontSize: 18,
    lineHeight: 25,
    color: '#F4F4F3',
    flex: 1,
  },
  caption: { fontFamily, fontSize: 12, lineHeight: 19, color: '#B0B0B4' },
  pie: { height: 238, width: '100%', marginVertical: 4 },
  pieCenter: {
    position: 'absolute',
    top: 72,
    bottom: 72,
    left: '25%',
    right: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  centerLabel: {
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: '#B0B0B4',
    textAlign: 'center',
  },
  centerValue: {
    fontWeight: '700',
    fontFamily: fontFamilyBold,
    fontSize: 17,
    lineHeight: 23,
    color: '#F4F4F3',
    textAlign: 'center',
  },
  bar: { height: 200 },
  barChart: { height: 200 },
  axis: { fontFamily, fontSize: 10, color: '#B0B0B4' },
  axisActive: { color: '#FFFFFF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#202124',
    borderRadius: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowName: {
    fontFamily,
    fontSize: 14,
    lineHeight: 21,
    color: '#B0B0B4',
    flex: 1,
    flexShrink: 1,
  },
  rowValue: {
    fontWeight: '500',
    fontFamily: fontFamilyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: '#F4F4F3',
    maxWidth: '52%',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  selected: { backgroundColor: '#1B1915' },
  selectedText: {
    fontWeight: '700',
    color: '#F4F4F3',
    fontFamily: fontFamilyBold,
  },
  hover: { backgroundColor: '#25221B' },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  pageButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#191A1C',
  },
  disabled: { opacity: 0.3 },
  source: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: '#202124',
    paddingTop: 14,
  },
  sourceCopy: { flex: 1, gap: 5 },
  sourceText: { fontFamily, fontSize: 11, lineHeight: 18, color: '#929399' },
});
