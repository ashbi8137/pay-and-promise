import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Scales a size based on the device screen width relative to a standard 375px width (iPhone X/11/12/13/Mini).
 * This function is marked as a 'worklet' to be safe for use in Reanimated threads.
 * 
 * Formula: (screen_width / 375) * size
 */
export const scaleFont = (size: number) => {
    'worklet';
    const newSize = (SCREEN_WIDTH / 375) * size;
    return Math.round(newSize);
};

export const SCREEN_DIMENSIONS = Dimensions.get('window');
