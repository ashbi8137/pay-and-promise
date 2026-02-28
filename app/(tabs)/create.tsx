import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import CreatePromiseScreen from '../screens/CreatePromiseScreen';

const PROMISE_MODE_KEY = 'PROMISE_MODE_PREFERENCE';

export default function CreateTab() {
    const [mode, setMode] = useState<string>('group');

    // Re-read mode every time this tab gets focused
    useFocusEffect(
        useCallback(() => {
            AsyncStorage.getItem(PROMISE_MODE_KEY).then(savedMode => {
                if (savedMode === 'self' || savedMode === 'group') setMode(savedMode);
            }).catch(() => { });
        }, [])
    );

    return <CreatePromiseScreen overrideMode={mode} />;
}
