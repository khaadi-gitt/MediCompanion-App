import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { LogoMark } from '../components/LogoMark';

export function SplashScreen() {
  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const topShift = isDesktop
    ? Math.max(36, Math.min(72, height * 0.06))
    : Math.max(74, Math.min(120, height * 0.1));
  const splashContentWidth = Math.min(isDesktop ? 560 : 420, width - 28);
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const scaleAnim = useState(() => new Animated.Value(0.92))[0];
  const floatAnim = useState(() => new Animated.Value(8))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(floatAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, floatAnim, scaleAnim]);

  return (
    <View style={[styles.centerWrap, { paddingTop: topShift }]}>
      <View style={[styles.splashContent, { width: splashContentWidth }]}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
          }}
        >
          <LogoMark size="splash" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  splashContent: {
    alignItems: 'center',
  },
});
