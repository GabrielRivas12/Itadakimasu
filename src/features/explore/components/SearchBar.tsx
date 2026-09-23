import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  onPress?: () => void;
}

export function SearchBar({ value = '', onChangeText, onClear, onPress }: SearchBarProps) {
  const input = (
    <>
      <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
      {onPress ? (
        <Text style={styles.placeholder}>Buscar anime...</Text>
      ) : (
        <>
          <TextInput
            placeholder="Buscar anime..."
            placeholderTextColor="#64748b"
            style={styles.searchInput}
            value={value}
            onChangeText={onChangeText}
            clearButtonMode="while-editing"
          />
          {value !== '' && (
            <TouchableOpacity onPress={onClear}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );

  return (
    <View style={styles.searchContainer}>
      {onPress ? (
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.7} onPress={onPress}>
          {input}
        </TouchableOpacity>
      ) : (
        <View style={styles.searchBar}>{input}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  placeholder: {
    color: '#64748b',
    fontSize: 15,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
});