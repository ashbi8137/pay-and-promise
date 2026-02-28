import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import CreatePromiseScreen from '../screens/CreatePromiseScreen';

const PROMISE_MODE_KEY = 'PROMISE_MODE_PREFERENCE';

export default function CreateTab() {
    const [mode, setMode] = useState<string>('group');

    useEffect(() => {
        AsyncStorage.getItem(PROMISE_MODE_KEY).then(savedMode => {
            if (savedMode === 'self' || savedMode === 'group') setMode(savedMode);
        }).catch(() => { });
    }, []);

    return <CreatePromiseScreen overrideMode={mode} />;
}
