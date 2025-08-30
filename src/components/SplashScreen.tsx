import React from 'react';
import { View, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <FastImage
        source={require('@assets/splash_logo.png')}
        resizeMode={FastImage.resizeMode.contain}
        style={{
          width: Math.min(260, width * 0.6),
          height: Math.min(260, width * 0.6),
        }}
      />
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="large" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#447055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrap: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
});
