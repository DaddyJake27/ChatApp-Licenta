import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import AppNavigator from '@navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // hides the native (static) splash once React is mounted
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
