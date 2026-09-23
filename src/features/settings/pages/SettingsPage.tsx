import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Linking, 
  Modal, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useResponsive } from '../../../hooks/useResponsive';
import { 
  getIsAdultContentEnabled, 
  setIsAdultContentEnabled,
  getIsNotificationsEnabled,
  setIsNotificationsEnabled,
  getEpisodeOrder,
  setEpisodeOrder,
  getPlayerType,
  setPlayerType
} from '../../../../services/cache';
import { inicializarNotificaciones } from '../../../../services/notification';

export const SettingsPage = () => {
  const router = useRouter();
  const { isWeb, getContentWidth, isMobile } = useResponsive();
  const contentWidth = isWeb ? getContentWidth() : '100%';
  const [isAdultContentEnabled, setAdultContentEnabled] = useState(false);
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const [episodeOrder, setEpisodeOrderState] = useState<'asc' | 'desc'>('asc');
  const [playerType, setPlayerTypeState] = useState<'native' | 'webview'>('native');
  
  // Modal state
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [adultEnabled, notificationsEnabled, order] = await Promise.all([
      getIsAdultContentEnabled(),
      getIsNotificationsEnabled(),
      getEpisodeOrder()
    ]);

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (!hasPermission && notificationsEnabled) {
        setNotificationsEnabled(false);
        await setIsNotificationsEnabled(false);
      } else {
        setNotificationsEnabled(notificationsEnabled);
      }
    } else {
      setNotificationsEnabled(notificationsEnabled);
    }

    setAdultContentEnabled(adultEnabled);
    setEpisodeOrderState(order);

    const player = await getPlayerType();
    setPlayerTypeState(player);
  };

  const handleToggleAdultContent = async (value: boolean) => {
    setAdultContentEnabled(value);
    await setIsAdultContentEnabled(value);
  };

  const handleTogglePlayerType = async () => {
    const newType = playerType === 'native' ? 'webview' : 'native';
    setPlayerTypeState(newType);
    await setPlayerType(newType);
  };

  const handleToggleEpisodeOrder = async () => {
    const newOrder = episodeOrder === 'asc' ? 'desc' : 'asc';
    setEpisodeOrderState(newOrder);
    await setEpisodeOrder(newOrder);
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value && Platform.OS === 'android') {
      try {
        // En Android 13+ (API 33) se requiere permiso explícito para notificaciones
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Permiso de Notificaciones',
              message: 'Itadakimasu necesita permiso para enviarte notificaciones sobre nuevos episodios.',
              buttonNeutral: 'Preguntar después',
              buttonNegative: 'Cancelar',
              buttonPositive: 'OK',
            }
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permiso Denegado', 
              'No podremos enviarte notificaciones sin tu permiso. Puedes activarlo desde los ajustes del sistema.'
            );
            return;
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }

    setNotificationsEnabled(value);
    await setIsNotificationsEnabled(value);
    if (value) {
      await inicializarNotificaciones();
    }
  };

  const handleSendReport = () => {
    if (!reportTitle.trim() || !reportDescription.trim()) {
      Alert.alert('Campos incompletos', 'Por favor rellena el título y la descripción del error.');
      return;
    }

    const subject = encodeURIComponent(`Reporte de Error: ${reportTitle}`);
    const body = encodeURIComponent(reportDescription);
    const mailtoUrl = `mailto:itadakimasuapp1@gmail.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de correo.');
    });

    setReportModalVisible(false);
    setReportTitle('');
    setReportDescription('');
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.header,
        isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
        isWeb && isMobile && { paddingTop: 20, paddingHorizontal: 16 }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>
      
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isWeb && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicación</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="notifications-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Notificaciones</Text>
              <Switch
                trackColor={{ false: '#2d3748', true: '#8b5cf6' }}
                thumbColor={isNotificationsEnabled ? '#ffffff' : '#94a3b8'}
                ios_backgroundColor="#2d3748"
                onValueChange={handleToggleNotifications}
                value={isNotificationsEnabled}
              />
            </View>
            <View style={[styles.settingItem, styles.lastItem]}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="warning-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Contenido +18</Text>
              <Switch
                trackColor={{ false: '#2d3748', true: '#8b5cf6' }}
                thumbColor={isAdultContentEnabled ? '#ffffff' : '#94a3b8'}
                ios_backgroundColor="#2d3748"
                onValueChange={handleToggleAdultContent}
                value={isAdultContentEnabled}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reproducción</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="swap-vertical-outline" size={22} color="#8b5cf6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Orden de episodios</Text>
                <Text style={styles.settingValue}>
                  {episodeOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                </Text>
              </View>
              <Switch
                trackColor={{ false: '#2d3748', true: '#8b5cf6' }}
                thumbColor={episodeOrder === 'desc' ? '#ffffff' : '#94a3b8'}
                ios_backgroundColor="#2d3748"
                onValueChange={handleToggleEpisodeOrder}
                value={episodeOrder === 'desc'}
              />
            </View>
            <View style={[styles.settingItem, styles.lastItem]}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="videocam-outline" size={22} color="#8b5cf6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Reproductor</Text>
                <Text style={styles.settingValue}>
                  {playerType === 'native' ? 'Nativo' : 'WebView'}
                </Text>
              </View>
              <Switch
                trackColor={{ false: '#2d3748', true: '#8b5cf6' }}
                thumbColor={playerType === 'webview' ? '#ffffff' : '#94a3b8'}
                ios_backgroundColor="#2d3748"
                onValueChange={handleTogglePlayerType}
                value={playerType === 'webview'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={() => router.push('/edit-profile')}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="person-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Información de la cuenta</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]} 
              onPress={() => router.push('/privacy')}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Privacidad y Políticas</Text>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]} 
              onPress={() => setReportModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="bug-outline" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.settingLabel}>Reportar un error</Text>
              <Ionicons name="mail-outline" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]} 
              onPress={() => router.push('/system-details')}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="information-circle-outline" size={22} color="#8b5cf6" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Versión de la App</Text>
                <View style={styles.versionContainer}>
                  <Text style={styles.settingValue}>{Constants.expoConfig?.version || '1.2.0'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 4 }} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[
            styles.modalContent,
            isWeb && { maxWidth: 500, alignSelf: 'center', width: '100%' },
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar un Error</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Título del Error</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. El episodio no carga"
                placeholderTextColor="#64748b"
                value={reportTitle}
                onChangeText={setReportTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe qué pasó y cómo podemos reproducirlo..."
                placeholderTextColor="#64748b"
                multiline={true}
                numberOfLines={4}
                value={reportDescription}
                onChangeText={setReportDescription}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendReport}
            >
              <Text style={styles.sendButtonText}>Enviar por Correo</Text>
              <Ionicons name="send" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#0b0f19',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#161b2c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
    gap: 12,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  settingTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '400',
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 120,
  },
  sendButton: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
