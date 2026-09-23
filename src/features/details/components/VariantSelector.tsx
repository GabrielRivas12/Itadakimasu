import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Anime1VVariant } from '../../../../services/anime1v';

interface VariantSelectorProps {
  hasDub: boolean;
  selectedVariant: Anime1VVariant;
  onVariantChange: (variant: Anime1VVariant) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  hasDub,
  selectedVariant,
  onVariantChange,
}) => {
  if (!hasDub) return null;

  const variants: { key: Anime1VVariant; label: string; subtitle: string; icon: 'chatbubble-ellipses-outline' | 'mic-outline' }[] = [
    { key: 'SUB', label: 'Subtitulado', subtitle: 'SUB', icon: 'chatbubble-ellipses-outline' },
    { key: 'DUB', label: 'Doblaje', subtitle: 'DUB', icon: 'mic-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="volume-high-outline" size={16} color="#8b5cf6" />
        <Text style={styles.title}>Audio:</Text>
      </View>
      <View style={styles.segment}>
        {variants.map((variant, index) => {
          const isSelected = selectedVariant === variant.key;
          return (
            <TouchableOpacity
              key={variant.key}
              style={[styles.option, isSelected && styles.optionSelected, index === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }, index === variants.length - 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10 }]}
              onPress={() => onVariantChange(variant.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={variant.icon}
                size={15}
                color={isSelected ? '#ffffff' : '#94a3b8'}
              />
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {variant.label}
              </Text>
              <Text style={[styles.optionBadge, isSelected && styles.optionBadgeSelected]}>
                {variant.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#111827',
  },
  optionSelected: {
    backgroundColor: '#8b5cf6',
  },
  optionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  optionBadge: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  optionBadgeSelected: {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});