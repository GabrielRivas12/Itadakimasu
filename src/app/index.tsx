import React from 'react';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { LandingPage } from '../features/landing/pages/LandingPage';

export default function RootIndex() {
  // En Web, mostramos la Landing Page
  if (Platform.OS === 'web') {
    return <LandingPage />;
  }

  // En Móvil, redirigimos directamente a la app (Home)
  return <Redirect href="/home" />;
}
