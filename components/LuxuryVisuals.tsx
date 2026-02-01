import { Dimensions, DimensionValue, StyleSheet, View } from 'react-native';
import { scaleFont } from '../app/utils/layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * AbstractProtocolBackground
 * A high-end, non-linear background element replacing the standard grid.
 * Features a "Neural Mesh" of thin connections and floating nodes.
 */
export const AbstractProtocolBackground = () => null;

// Keep GridOverlay as alias for now to prevent breaks while migrating
export const GridOverlay = AbstractProtocolBackground;

interface AmbientGlowProps {
    size: number;
    color: string;
    top?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
    bottom?: DimensionValue;
    opacity?: number;
}

export const AmbientGlow = ({ size, color, top, left, right, bottom, opacity = 0.1 }: AmbientGlowProps) => (
    <View style={[
        styles.glowBase,
        {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            top,
            left,
            right,
            bottom
        }
    ]} />
);

export const NebulaGlow = ({ color = "#4F46E5", top, left, right, bottom, scale = 1 }: { color?: string, top?: DimensionValue, left?: DimensionValue, right?: DimensionValue, bottom?: DimensionValue, scale?: number }) => (
    <View style={[styles.nebulaContainer, { top, left, right, bottom, transform: [{ scale }] }]} pointerEvents="none">
        <View style={[styles.nebulaOrb, { width: scaleFont(400), height: scaleFont(400), borderRadius: scaleFont(200), backgroundColor: color, opacity: 0.08, top: scaleFont(-50), left: scaleFont(-50) }]} />
        <View style={[styles.nebulaOrb, { width: scaleFont(300), height: scaleFont(300), borderRadius: scaleFont(150), backgroundColor: color, opacity: 0.05, bottom: scaleFont(-30), right: scaleFont(-20) }]} />
        <View style={[styles.nebulaOrb, { width: scaleFont(200), height: scaleFont(200), borderRadius: scaleFont(100), backgroundColor: "#7C3AED", opacity: 0.04, top: scaleFont(100), right: scaleFont(40) }]} />
    </View>
);

const styles = StyleSheet.create({
    abstractContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        overflow: 'hidden',
    },
    abstractLine: {
        position: 'absolute',
        height: scaleFont(1),
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
    },
    glowBase: {
        position: 'absolute',
        zIndex: 0
    },
    nebulaContainer: {
        position: 'absolute',
        width: scaleFont(500),
        height: scaleFont(500),
        zIndex: 0,
    },
    nebulaOrb: {
        position: 'absolute',
        zIndex: 0,
    }
});
