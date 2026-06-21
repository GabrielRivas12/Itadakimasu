import { Platform } from 'react-native';
import { asegurarFirebaseApp } from './firebaseConfig';

export interface RemoteMessage {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: Record<string, string>;
}

type NotificacionCallback = (mensaje: RemoteMessage) => void;

let listeners: NotificacionCallback[] = [];

function notificarListeners(mensaje: RemoteMessage) {
  listeners.forEach((cb) => cb(mensaje));
}

export function suscribirseANotificaciones(callback: NotificacionCallback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}

export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    const permiso = await Notification.requestPermission();
    return permiso === 'granted';
  }

  asegurarFirebaseApp();
  const { getMessaging, requestPermission, AuthorizationStatus } = require('@react-native-firebase/messaging');
  const authStatus = await requestPermission(getMessaging());
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function obtenerTokenFCM(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      asegurarFirebaseApp();
      const { getMessaging, getToken } = require('firebase/messaging');
      return await getToken(getMessaging());
    }

    const { getMessaging, getToken } = require('@react-native-firebase/messaging');
    return await getToken(getMessaging());
  } catch (error) {
    console.error('[Notificaciones] Error al obtener token:', error);
    return null;
  }
}

function onMensajeEnPrimerPlano() {
  if (Platform.OS === 'web') {
    asegurarFirebaseApp();
    const { getMessaging, onMessage } = require('firebase/messaging');
    onMessage(getMessaging(), (mensaje: any) => {
      const remoteMessage: RemoteMessage = {
        notification: mensaje.notification
          ? {
              title: mensaje.notification.title,
              body: mensaje.notification.body,
              image: mensaje.notification.image,
            }
          : undefined,
        data: mensaje.data,
      };
      notificarListeners(remoteMessage);
    });
    return;
  }

  const { getMessaging, onMessage } = require('@react-native-firebase/messaging');
  onMessage(getMessaging(), async (remoteMessage: any) => {
    const msg: RemoteMessage = {
      notification: remoteMessage.notification
        ? {
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            image: remoteMessage.notification.image,
          }
        : undefined,
      data: remoteMessage.data,
    };
    notificarListeners(msg);
  });
}

export function configurarManejadorSegundoPlano(): void {
  if (Platform.OS === 'web') return;

  try {
    asegurarFirebaseApp();
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    setBackgroundMessageHandler(getMessaging(), async (remoteMessage: any) => {
      console.log('[Notificaciones] Mensaje en segundo plano:', {
        notification: remoteMessage.notification,
        data: remoteMessage.data,
      });
    });
  } catch (error) {
    console.error('[Notificaciones] Error al configurar manejador de segundo plano:', error);
  }
}

export async function inicializarNotificaciones(): Promise<string | null> {
  try {
    asegurarFirebaseApp();
    configurarManejadorSegundoPlano();

    const permisoConcedido = await solicitarPermisoNotificaciones();
    if (!permisoConcedido) {
      console.warn('[Notificaciones] Permiso denegado');
      return null;
    }

    const token = await obtenerTokenFCM();
    if (token) {
     // console.log('[Notificaciones] Token FCM:', token);
    }

    onMensajeEnPrimerPlano();

    return token;
  } catch (error) {
    console.error('[Notificaciones] Error al inicializar:', error);
    return null;
  }
}

export function onNotificacionAbierta(callback: NotificacionCallback) {
  if (Platform.OS === 'web') return () => {};

  const { getMessaging, onNotificationOpenedApp } = require('@react-native-firebase/messaging');
  const unsuscribeOpened = onNotificationOpenedApp(
    getMessaging(),
    (remoteMessage: any) => {
      const msg: RemoteMessage = {
        notification: remoteMessage.notification
          ? {
              title: remoteMessage.notification.title,
              body: remoteMessage.notification.body,
              image: remoteMessage.notification.image,
            }
          : undefined,
        data: remoteMessage.data,
      };
      callback(msg);
    }
  );

  return unsuscribeOpened;
}

export async function getNotificacionInicial(): Promise<RemoteMessage | null> {
  if (Platform.OS === 'web') return null;

  const { getMessaging, getInitialNotification } = require('@react-native-firebase/messaging');
  const remoteMessage = await getInitialNotification(getMessaging());
  if (remoteMessage) {
    return {
      notification: remoteMessage.notification
        ? {
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            image: remoteMessage.notification.image,
          }
        : undefined,
      data: remoteMessage.data,
    };
  }
  return null;
}
