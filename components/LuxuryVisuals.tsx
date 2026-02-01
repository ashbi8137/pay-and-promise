import { Dimensions, DimensionValue, StyleSheet, View } from 'react-native';

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
        <View style={[styles.nebulaOrb, { width: 400, height: 400, borderRadius: 200, backgroundColor: color, opacity: 0.08, top: -50, left: -50 }]} />
        <View style={[styles.nebulaOrb, { width: 300, height: 300, borderRadius: 150, backgroundColor: color, opacity: 0.05, bottom: -30, right: -20 }]} />
        <View style={[styles.nebulaOrb, { width: 200, height: 200, borderRadius: 100, backgroundColor: "#7C3AED", opacity: 0.04, top: 100, right: 40 }]} />
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
        height: 1,
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
    },
    glowBase: {
        position: 'absolute',
        zIndex: 0
    },
    nebulaContainer: {
        position: 'absolute',
        width: 500,
        height: 500,
        zIndex: 0,
    },
    nebulaOrb: {
        position: 'absolute',
        zIndex: 0,
    }
});
