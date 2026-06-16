import { Image, StyleSheet, useWindowDimensions } from 'react-native';

export function LogoMark({ size }: { size: 'splash' | 'login' }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const logoWidth =
    size === 'splash'
      ? Math.min(width * (isDesktop ? 0.44 : 0.62), isDesktop ? 360 : 260)
      : Math.min(width * (isDesktop ? 0.34 : 0.52), isDesktop ? 250 : 220);
  const logoHeight = logoWidth * (203 / 281);

  return (
    <Image
      source={require('../../assets/branding/brand-lockup-transparent.png')}
      style={[styles.logoImage, { width: logoWidth, height: logoHeight }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logoImage: {
    marginBottom: 2,
  },
});
