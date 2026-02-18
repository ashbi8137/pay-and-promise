import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    BackHandler,
    Platform,
    Animated as RNAnimated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GridOverlay } from '../../components/LuxuryVisuals';
import WalkthroughOverlay from '../../components/WalkthroughOverlay';
import WelcomeBonusModal from '../../components/WelcomeBonusModal';
import { Colors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

// Data Interface matching Supabase Schema
interface PromiseItem {
    id: string;
    title: string;
    description?: string;
    duration_days: number;
    number_of_people: number;
    commitment_level?: string;
    locked_points?: number;
    participants: any[]; // jsonb 
    status: 'active' | 'completed' | 'failed' | 'active_waiting';
    days_completed: number;
    created_at: string;
}

const HAS_SEEN_TOOLTIP_KEY = 'HAS_SEEN_ONBOARDING_TOOLTIP';

export default function HomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { showAlert } = useAlert();

    // RESTORED STATE
    const [firstName, setFirstName] = useState<string>('');
    const [activePromises, setActivePromises] = useState<PromiseItem[]>([]);
    const [completedPromises, setCompletedPromises] = useState<PromiseItem[]>([]);
    const [recentlyCompleted, setRecentlyCompleted] = useState<PromiseItem[]>([]);
    const [promiseListTab, setPromiseListTab] = useState<'in_progress' | 'completed'>('in_progress');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ppStats, setPpStats] = useState({ balance: 0, streak: 0, level: 1 });

    // Tooltip & Tutorial State
    const [showTooltip, setShowTooltip] = useState(false);
    const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;

    // Swing Animation for Date Tag
    const rotation = useSharedValue(0);

    useEffect(() => {
        checkTooltip();
        startPulse();

        // Check for tutorial flag in user metadata
        checkTutorialStatus();

        // Start swinging animation
        rotation.value = withRepeat(
            withSequence(
                withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.quad) })
            ),
            -1, // Infinite
            true // Reverse
        );
    }, []);

    const animatedSwingStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotateZ: `${rotation.value}deg` }],
        };
    });

    const checkTooltip = async () => {
        // Simple check to show tooltip once
        try {
            const hasSeen = await AsyncStorage.getItem(HAS_SEEN_TOOLTIP_KEY);
            if (!hasSeen) {
                setTimeout(() => setShowTooltip(true), 1500);
            }
        } catch (e) {
            console.log('Error checking tooltip', e);
        }
    };

    const dismissTooltip = async () => {
        setShowTooltip(false);
        await AsyncStorage.setItem(HAS_SEEN_TOOLTIP_KEY, 'true');
    };

    const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);

    const handleTutorialComplete = async () => {
        setShouldShowTutorial(false);
        try {
            await supabase.auth.updateUser({
                data: { has_seen_tutorial: true }
            });
            // Show celebration after tutorial
            setTimeout(() => {
                setShowWelcomeBonus(true);
            }, 500);
        } catch (e) {
            console.log('Error updating tutorial flag:', e);
        }
    };


    const startPulse = () => {
        RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();

            const onBackPress = () => {
                showAlert({
                    title: 'Hold on!',
                    message: 'Are you sure you want to exit the app? Any unsaved progress may be lost.',
                    type: 'info',
                    buttons: [
                        {
                            text: 'Cancel',
                            onPress: () => null,
                            style: 'cancel',
                        },
                        {
                            text: 'Exit Application',
                            onPress: () => BackHandler.exitApp(),
                            style: 'destructive'
                        },
                    ]
                });
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
        }, [])
    );



    const checkTutorialStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.user_metadata?.has_seen_tutorial) {
            setShouldShowTutorial(true);
        }
    };

    const fetchData = async () => {
        // Don't set loading=true here to avoid flashing the empty state/spinner on every focus
        // Only use strict loading for initial mount if needed, or rely on existing data
        // setLoading(true); 
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Set Name
                const metadataName = user.user_metadata?.full_name;
                if (metadataName) {
                    setFirstName(metadataName.split(' ')[0]);
                } else if (user.email) {
                    setFirstName(user.email.split('@')[0]);
                }

                // Fetch PP stats
                const { data: ppData } = await supabase
                    .from('profiles')
                    .select('promise_points, current_streak, level')
                    .eq('id', user.id)
                    .single();
                if (ppData) {
                    setPpStats({
                        balance: ppData.promise_points || 0,
                        streak: ppData.current_streak || 0,
                        level: ppData.level || 1,
                    });
                }

                // 1. Fetch Promsie IDs where user is a participant
                const { data: myParticipations, error: partError } = await supabase
                    .from('promise_participants')
                    .select('promise_id')
                    .eq('user_id', user.id);

                if (partError) {
                    console.error('Participant fetch error:', partError);
                }

                let promises: PromiseItem[] = [];

                if (myParticipations && myParticipations.length > 0) {
                    const promiseIds = myParticipations.map(p => p.promise_id);

                    // 2. Fetch Promise Details for these IDs
                    const { data: fetchedPromises, error: promiseError } = await supabase
                        .from('promises')
                        .select('*')
                        .in('id', promiseIds)
                        .order('created_at', { ascending: false });

                    if (promiseError) console.error('Promise details error:', promiseError);

                    if (fetchedPromises) {
                        promises = fetchedPromises;
                    }
                }

                // 2. Fetch Today's Checkins (My Status)
                const today = new Date().toISOString().split('T')[0];
                const { data: checkins, error: checkinError } = await supabase
                    .from('daily_checkins')
                    .select('promise_id, status')
                    .eq('user_id', user.id)
                    .eq('date', today);

                if (checkinError) console.error('Checkin fetch error:', checkinError);

                if (promises) {
                    const todayCheckinMap = new Map();
                    checkins?.forEach(c => todayCheckinMap.set(c.promise_id, c.status));

                    const pending: PromiseItem[] = [];
                    const done: PromiseItem[] = [];
                    const justCompleted: PromiseItem[] = [];

                    for (const p of promises) {
                        // 1. If Promise is finalized (Completed/Failed entirely), it goes to Completed Tab
                        if (p.status !== 'active') {
                            done.push(p);
                            const startDate = new Date(p.created_at);
                            const endDate = new Date(startDate);
                            endDate.setDate(startDate.getDate() + p.duration_days);
                            const now = new Date();
                            const hoursSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60);
                            if (p.status === 'completed' && hoursSinceEnd >= 0 && hoursSinceEnd < 24) {
                                justCompleted.push(p);
                            }
                            continue;
                        }

                        // 1b. If promise is 'active' but past its duration, treat as expired/completed
                        const startDate = new Date(p.created_at);
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + (p.duration_days || 7));
                        if (new Date() > endDate) {
                            done.push({ ...p, status: 'completed' });
                            continue;
                        }

                        // 2. Active promise — check if user already checked in today
                        if (todayCheckinMap.has(p.id)) {
                            // User checked in — waiting for peers
                            pending.push({ ...p, status: 'active_waiting' });
                        } else {
                            // User hasn't checked in yet
                            pending.push(p);
                        }
                    }

                    setActivePromises(pending);
                    setCompletedPromises(done);
                    setRecentlyCompleted(justCompleted);
                }
            }
        } catch (error) {
            console.log('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const handleCreatePromise = () => {
        router.push('/screens/CreatePromiseScreen');
    };

    const getGoalIcon = (description?: string, status?: string) => {
        if (status === 'failed') return 'alert-circle';
        if (status === 'completed') return 'checkmark-circle';

        switch (description) {
            case 'gym': return 'barbell';
            case 'code': return 'code-slash';
            case 'read': return 'book';
            case 'water': return 'water';
            case 'wake': return 'alarm';
            case 'run': return 'run';
            case 'walk': return 'walk';
            case 'study': return 'school';
            case 'custom': return 'layers';
            default: return 'prism';
        }
    };

    const getGoalColor = (description?: string) => {
        switch (description) {
            case 'gym': return '#4F46E5';
            case 'code': return '#6366F1';
            case 'read': return '#8B5CF6';
            case 'water': return '#7C3AED';
            case 'wake': return '#4338CA';
            case 'custom': return '#6D28D9';
            default: return '#4F46E5';
        }
    };

    const handlePromisePress = (item: PromiseItem) => {
        const mappedItem = {
            ...item,
            duration: item.duration_days,
            numPeople: item.number_of_people,
            commitmentLevel: item.commitment_level || 'medium',
            lockedPoints: item.locked_points || 10,
        };

        router.push({
            pathname: '/screens/PromiseDetailScreen',
            params: { promise: JSON.stringify(mappedItem) }
        });
    };

    const renderCard = (item: PromiseItem, isHistory: boolean) => {
        const currentDay = 1; // Logic placeholder - ideally calculate from created_at
        const totalDays = item.duration_days;
        const progressPercent = isHistory ? 100 : (currentDay / totalDays) * 100;
        const isFailed = item.status === 'failed';

        return (
            <Animated.View
                entering={FadeInDown.delay(isHistory ? 400 : 300).springify()}
                key={item.id}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handlePromisePress(item)}
                >
                    <View style={[styles.card, { backgroundColor: theme.card, borderColor: 'rgba(0,0,0,0.02)' }, isHistory && styles.completedCard]}>
                        {/* Icon Box (Reference Style) */}
                        <View style={[
                            styles.cardIconBox,
                            {
                                backgroundColor: item.status === 'failed' ? '#FEF2F2' :
                                    (item.status === 'completed' ? '#F1F5F9' : `${getGoalColor(item.description)}15`)
                            }
                        ]}>
                            {item.description === 'run' ? (
                                <MaterialCommunityIcons
                                    name={getGoalIcon(item.description, item.status) as any}
                                    size={24}
                                    color={item.status === 'failed' ? '#EF4444' :
                                        (item.status === 'completed' ? '#94A3B8' : getGoalColor(item.description))}
                                />
                            ) : (
                                <Ionicons
                                    name={getGoalIcon(item.description, item.status) as any}
                                    size={24}
                                    color={item.status === 'failed' ? '#EF4444' :
                                        (item.status === 'completed' ? '#94A3B8' : getGoalColor(item.description))}
                                />
                            )}
                        </View>

                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardTitle, { color: theme.text }, isHistory && styles.completedText]} numberOfLines={1}>{item.title}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.icon} style={{ opacity: 0.5 }} />
                            </View>

                            <View style={styles.cardFooter}>
                                {item.status === 'active' && (
                                    <View style={[styles.daysTag, { backgroundColor: '#F8FAFC' }]}>
                                        <Text style={[styles.daysTagText, { color: theme.icon }]}>{item.duration_days} Days</Text>
                                    </View>
                                )}
                                <View style={styles.metaItem}>
                                    <Text style={[styles.cardMeta, { color: theme.icon }]}>{item.number_of_people} friends</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <View style={[styles.dotSeparator, { backgroundColor: theme.border }]} />
                                    <Text style={[styles.cardMeta, { color: (item.commitment_level || 'medium') === 'high' ? '#EF4444' : (item.commitment_level || 'medium') === 'low' ? '#10B981' : '#F59E0B' }]}>
                                        {((item.commitment_level || 'medium').charAt(0).toUpperCase() + (item.commitment_level || 'medium').slice(1))}
                                    </Text>
                                </View>
                            </View>

                            {/* Progress Bar (Subtle at bottom of content) */}
                            {!isHistory && (
                                <View style={[styles.progressBarContainer, { backgroundColor: '#E0E7FF', marginTop: 12 }]}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${progressPercent}%`, backgroundColor: '#4F46E5' } // Violet Progress
                                        ]}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" colors={['#4F46E5']} />
                    }
                >
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        {/* TYPOGRAPHIC HERO HEADER */}
                        <View style={styles.heroHeaderContainer}>
                            <View style={styles.typographyBlock}>
                                <Text style={styles.greetingLight} allowFontScaling={false}>Welcome,</Text>
                                <Text style={styles.userNameHero} allowFontScaling={false}>{firstName || 'Agent'}</Text>
                                <View style={styles.taglineContainer}>
                                    <View style={styles.taglineAccent} />
                                    <Text style={styles.taglineText} allowFontScaling={false}>YOUR WORD. YOUR LEGACY</Text>
                                </View>
                            </View>

                            {/* HANGING SWING DATE TAG */}
                            <View style={styles.hangingContainer}>
                                {/* The String */}
                                <View style={styles.hangingThread} />
                                {/* The Tag */}
                                <Animated.View style={[styles.swingingTag, animatedSwingStyle]}>
                                    <View style={styles.tagHole} />
                                    <Text style={styles.tagDayNum} allowFontScaling={false}>
                                        {new Date().getDate().toString().padStart(2, '0')}
                                    </Text>
                                    <Text style={styles.tagMonth} allowFontScaling={false}>
                                        {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                    </Text>
                                </Animated.View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* PP STATS BANNER */}
                    <Animated.View entering={FadeInDown.delay(150).springify()}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => router.push('/(tabs)/profile')}
                        >
                            <LinearGradient
                                colors={['#5B2DAD', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    borderRadius: scaleFont(20),
                                    padding: scaleFont(18),
                                    marginBottom: scaleFont(16),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                {/* Decorative circle */}
                                <View style={{ position: 'absolute', top: -scaleFont(20), right: -scaleFont(20), width: scaleFont(80), height: scaleFont(80), borderRadius: scaleFont(40), backgroundColor: 'rgba(255,255,255,0.08)' }} />

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleFont(12) }}>
                                    <View style={{ width: scaleFont(42), height: scaleFont(42), borderRadius: scaleFont(21), backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="diamond" size={scaleFont(20)} color="#E0D4F5" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: scaleFont(22), fontWeight: '900', color: '#FFFFFF', fontFamily: 'Outfit_800ExtraBold' }}>
                                            {ppStats.balance} PP
                                        </Text>
                                        <Text style={{ fontSize: scaleFont(10), color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit_700Bold', letterSpacing: scaleFont(1) }}>PROMISE POINTS</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleFont(16) }}>
                                    {ppStats.streak > 0 && (
                                        <View style={{ alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleFont(3) }}>
                                                <Ionicons name="flame" size={scaleFont(16)} color="#FCA5A5" />
                                                <Text style={{ fontSize: scaleFont(16), fontWeight: '900', color: '#FCA5A5', fontFamily: 'Outfit_800ExtraBold' }}>{ppStats.streak}</Text>
                                            </View>
                                            <Text style={{ fontSize: scaleFont(8), color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_700Bold' }}>STREAK</Text>
                                        </View>
                                    )}
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: scaleFont(16), fontWeight: '900', color: '#FDE68A', fontFamily: 'Outfit_800ExtraBold' }}>Lv.{ppStats.level}</Text>
                                        <Text style={{ fontSize: scaleFont(8), color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit_700Bold' }}>LEVEL</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={scaleFont(16)} color="rgba(255,255,255,0.3)" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Hero Action Card */}
                    <Animated.View entering={FadeInDown.delay(200).springify()}>
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']} // Vibrant Violet/Indigo
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroContent}>
                                <View style={styles.heroTextContainer}>
                                    <Text style={styles.heroTitle} allowFontScaling={false}>Expand your circle!</Text>
                                    <Text style={styles.heroSubtitle} allowFontScaling={false}>
                                        Have a code? Join an existing promise and start building trust today.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.heroButton}
                                        onPress={() => router.push('/screens/JoinPromiseScreen')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.heroButtonText} allowFontScaling={false}>
                                            Join Promise
                                        </Text>
                                        <Ionicons name="arrow-forward" size={16} color="#4F46E5" style={{ marginLeft: 6 }} />
                                    </TouchableOpacity>
                                </View>
                                {/* Decorative Icon with glow effect */}
                                <View style={{ position: 'absolute', right: -5, bottom: -5 }}>
                                    <Ionicons name="people" size={90} color="rgba(255,255,255,0.35)" />
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* Congratulations Banner for Recently Completed Promises */}
                    {/* {recentlyCompleted.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(150).springify()}>
                            {recentlyCompleted.map(promise => (
                                <TouchableOpacity
                                    key={`congrats-${promise.id}`}
                                    style={[styles.congratsBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                                    onPress={() => router.push({
                                        pathname: '/screens/PromiseReportScreen',
                                        params: { promiseId: promise.id }
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.congratsContent}>
                                        <Text style={styles.congratsEmoji}>🎉</Text>
                                        <View style={styles.congratsTextContainer}>
                                            <Text style={styles.congratsTitle}>Congratulations!</Text>
                                            <Text style={styles.congratsSubtitle} numberOfLines={1}>
                                                You have successfully completed "{promise.title}"
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.congratsArrow}>
                                        <Text style={styles.congratsLink}>View report</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#059669" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </Animated.View>
                    )} */}

                    {/* ACTION SURFACE REMOVED - Replaced by FAB */}

                    {/* STATS ROW (If Data Exists) */}


                    {/* Promise List Section with "Editorial" Tabs */}
                    <View style={styles.promiseListSection}>

                        {/* Editorial Tab Switcher */}
                        <View style={styles.editorialTabs}>
                            <TouchableOpacity
                                onPress={() => setPromiseListTab('in_progress')}
                                activeOpacity={0.7}
                                style={{ marginRight: 32, paddingVertical: 8 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={[
                                    styles.editorialTabTitle,
                                    { color: promiseListTab === 'in_progress' ? theme.text : '#94A3B8' },
                                    promiseListTab !== 'in_progress' && { fontWeight: '400' }
                                ]}>
                                    Active Promises
                                </Text>
                                {promiseListTab === 'in_progress' && <View style={[styles.activeIndicator, { backgroundColor: '#1E3A8A' }]} />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPromiseListTab('completed')}
                                activeOpacity={0.7}
                                style={{ paddingVertical: 8 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={[
                                    styles.editorialTabTitle,
                                    { color: promiseListTab === 'completed' ? theme.text : '#94A3B8' },
                                    promiseListTab !== 'completed' && { fontWeight: '400' }
                                ]}>
                                    History
                                </Text>
                                {promiseListTab === 'completed' && <View style={[styles.activeIndicator, { backgroundColor: '#1E3A8A' }]} />}
                            </TouchableOpacity>
                        </View>

                        {/* Promise Cards based on selected tab */}
                        {promiseListTab === 'in_progress' ? (
                            // In Progress Promises
                            activePromises.length > 0 ? (
                                activePromises.map(item => renderCard(item, false))
                            ) : (
                                <View style={[styles.emptyStateContainer]}>
                                    <Text style={[styles.emptyStateTitleLuxury, { color: theme.text }]}>No active promises</Text>
                                    <Text style={[styles.emptyStateTextLuxury, { color: theme.icon }]}>
                                        Integrity is chosen, not given.
                                    </Text>
                                </View>
                            )
                        ) : (
                            // Completed Promises
                            completedPromises.filter(p => p.status === 'completed' || p.status === 'failed').length > 0 ? (
                                completedPromises.filter(p => p.status === 'completed' || p.status === 'failed').map(item => (
                                    <TouchableOpacity
                                        key={`completed-${item.id}`}
                                        activeOpacity={0.9}
                                        onPress={() => router.push({
                                            pathname: '/screens/PromiseReportScreen',
                                            params: { promiseId: item.id }
                                        })}
                                    >
                                        {renderCard(item, true)}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={[styles.emptyStateContainer]}>
                                    <Text style={[styles.emptyStateTextLuxury, { color: theme.icon }]}>
                                        Your completed journey will appear here.
                                    </Text>
                                </View>
                            )
                        )}
                    </View>

                </ScrollView>


            </SafeAreaView>

            {/* First-Time Walkthrough Overlay */}
            <WalkthroughOverlay
                initialVisible={shouldShowTutorial}
                onComplete={handleTutorialComplete}
            />
            {/* Celebration Modal */}
            <WelcomeBonusModal
                visible={showWelcomeBonus}
                onClose={() => setShowWelcomeBonus(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor handled dynamically
    },
    scrollContent: {
        padding: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(30) : scaleFont(10), // Reduced to remove vacant space
        paddingBottom: scaleFont(120), // Increased from 40 to clear bottom tabs
    },
    // HERO TYPOGRAPHY HEADER
    heroHeaderContainer: {
        marginBottom: scaleFont(32),
        paddingTop: scaleFont(10),
        flexDirection: 'row', // Side by side
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    // SWING DATE TAG
    hangingContainer: {
        alignItems: 'center',
        marginRight: scaleFont(28), // Moved toward left (away from edge)
        marginTop: scaleFont(-60), // Pull up significantly so rope starts off-screen
    },
    hangingThread: {
        width: scaleFont(2),
        height: scaleFont(100), // Long rope
        backgroundColor: '#CBD5E1', // Slightly darker thread for visibility
        marginBottom: scaleFont(-8), // Overlap with tag
    },
    swingingTag: {
        backgroundColor: '#FFFFFF',
        width: scaleFont(68), // Bigger
        paddingVertical: scaleFont(14),
        borderRadius: scaleFont(14), // Slightly softer
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        // Shadow for depth
        shadowColor: '#475569',
        shadowOffset: { width: 0, height: scaleFont(8) },
        shadowOpacity: 0.15,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(6),
    },
    tagHole: {
        width: scaleFont(10), // Bigger hole
        height: scaleFont(10),
        borderRadius: scaleFont(5),
        backgroundColor: '#CBD5E1',
        position: 'absolute',
        top: scaleFont(8),
    },
    tagDayNum: {
        fontSize: scaleFont(28), // Bigger number
        fontWeight: '800',
        color: '#1E293B',
        marginTop: scaleFont(8),
        lineHeight: scaleFont(28),
        fontFamily: 'Outfit_800ExtraBold',
    },
    tagMonth: {
        fontSize: scaleFont(12), // Bigger month
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginTop: scaleFont(3),
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_700Bold',
    },
    typographyBlock: {
        gap: scaleFont(-5),
        flex: 1,
        marginRight: scaleFont(20), // Ensure text doesn't touch the hanging date card
    },
    greetingLight: {
        fontSize: scaleFont(18),
        fontWeight: '500',
        color: '#94A3B8',
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_300Light',
    },
    greetingFocus: {
        fontSize: scaleFont(52), // Bolder
        fontWeight: '500',
        color: '#0F172A',
        letterSpacing: scaleFont(-2),
        textTransform: 'uppercase',
        lineHeight: scaleFont(60),
        fontFamily: 'Outfit_400Regular',
    },
    userNameHero: {
        fontSize: scaleFont(48),
        fontWeight: '800',
        color: '#4F46E5',
        letterSpacing: scaleFont(-1.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    taglineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scaleFont(14),
        gap: scaleFont(10),
    },
    taglineAccent: {
        width: scaleFont(28),
        height: scaleFont(3),
        backgroundColor: '#4F46E5',
        borderRadius: scaleFont(2),
    },
    taglineText: {
        fontSize: scaleFont(9), // Smaller to create gap
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: scaleFont(2),
        textTransform: 'uppercase',
        fontFamily: 'Outfit_700Bold', // Taglines are usually bold
    },

    // HERO CARD
    heroCard: {
        borderRadius: scaleFont(24),
        padding: scaleFont(24),
        marginBottom: scaleFont(32),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(10) },
        shadowOpacity: 0.25,
        shadowRadius: scaleFont(20),
        elevation: scaleFont(8),
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroTextContainer: {
        flex: 1,
        marginRight: scaleFont(16),
    },
    heroTitle: {
        fontSize: scaleFont(22),
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: scaleFont(8),
        fontFamily: 'Outfit_800ExtraBold',
    },
    heroSubtitle: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.9)',
        marginBottom: scaleFont(20),
        lineHeight: scaleFont(20),
        fontFamily: 'Outfit_300Light',
    },
    heroButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: scaleFont(18),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(12),
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroButtonText: {
        color: '#4F46E5',
        fontWeight: '700',
        fontSize: scaleFont(13),
        fontFamily: 'Outfit_700Bold',
    },

    // MICRO STATS
    microStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleFont(32),
    },
    microStatsText: {
        fontSize: scaleFont(13),
        fontWeight: '500',
        opacity: 0.6,
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_400Regular',
    },

    // EDITORIAL TABS (Luxury)
    editorialTabs: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: scaleFont(28),
        paddingHorizontal: scaleFont(8),
    },
    editorialTabTitle: {
        fontSize: scaleFont(24),
        fontWeight: '700', // Modern Bold
        letterSpacing: scaleFont(-0.5),
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    activeIndicator: {
        height: scaleFont(2), // Thinner
        width: scaleFont(32),
        marginTop: scaleFont(8),
    },

    card: {
        borderRadius: scaleFont(28), // More luxury curve
        marginBottom: scaleFont(20),
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        flexDirection: 'row',
        alignItems: 'center',
        padding: scaleFont(16),
        elevation: scaleFont(10),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(12) },
        shadowOpacity: 0.08,
        shadowRadius: scaleFont(16),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    cardIconBox: {
        width: scaleFont(56),
        height: scaleFont(56),
        borderRadius: scaleFont(16), // Soft square
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleFont(12), // Space between icon and content
    },
    cardContent: {
        flex: 1,
        paddingVertical: scaleFont(4),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scaleFont(6),
    },
    cardTitle: {
        fontSize: scaleFont(16),
        fontWeight: '600',
        flex: 1,
        marginRight: scaleFont(12),
        fontFamily: 'Outfit_700Bold', // Enforce Outfit
        color: '#1E293B',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(12), // Modern gap spacing
    },
    daysTag: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: scaleFont(8),
        paddingVertical: scaleFont(2),
        borderRadius: scaleFont(6),
    },
    daysTagText: {
        fontSize: scaleFont(11),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_400Regular',
    },
    cardMeta: {
        fontSize: scaleFont(12),
        fontWeight: '500',
        color: '#94A3B8',
        fontFamily: 'Outfit_300Light',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dotSeparator: {
        width: scaleFont(4),
        height: scaleFont(4),
        borderRadius: scaleFont(2),
        marginHorizontal: scaleFont(8),
    },

    // TRUST FOOTER
    trustFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleFont(48),
        gap: scaleFont(8),
        opacity: 0.4,
    },
    trustText: {
        fontSize: scaleFont(11),
        fontWeight: '500',
        letterSpacing: scaleFont(1),
        textTransform: 'uppercase',
        fontFamily: 'Outfit_400Regular',
    },

    // EMPTY STATS (Luxury)
    emptyStateContainer: {
        paddingVertical: scaleFont(60),
        paddingHorizontal: scaleFont(24),
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    emptyStateIconContainer: {
        width: scaleFont(64),
        height: scaleFont(64),
        borderRadius: scaleFont(32),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(16),
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyStateTitleLuxury: {
        fontSize: scaleFont(17),
        fontWeight: '700',
        marginBottom: scaleFont(6),
        textAlign: 'center',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    emptyStateTextLuxury: {
        fontSize: scaleFont(13),
        textAlign: 'center',
        fontWeight: '500',
        letterSpacing: scaleFont(0.3),
        color: '#94A3B8',
        fontStyle: 'italic',
        fontFamily: 'Outfit_300Light',
    },
    activeBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: scaleFont(8),
        paddingVertical: scaleFont(2),
        borderRadius: scaleFont(6),
        marginLeft: scaleFont(8),
    },
    activeBadgeText: {
        color: '#166534',
        fontSize: scaleFont(11),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    progressBarContainer: {
        height: scaleFont(10),
        borderRadius: scaleFont(5),
        overflow: 'hidden',
        marginTop: scaleFont(12),
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: scaleFont(5),
    },
    completedCard: {
        opacity: 0.7,
    },
    completedText: {
        textDecorationLine: 'line-through',
    },
    completedBadge: {
        paddingHorizontal: scaleFont(8),
        paddingVertical: scaleFont(2),
        borderRadius: scaleFont(8),
    },
    completedBadgeText: {
        fontSize: scaleFont(11),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    failedBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: scaleFont(8),
        paddingVertical: scaleFont(2),
        borderRadius: scaleFont(8),
    },
    failedBadgeText: {
        color: '#EF4444',
        fontSize: scaleFont(11),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    waitingBadge: {
        backgroundColor: '#FEF9C3',
        paddingHorizontal: scaleFont(8),
        paddingVertical: scaleFont(2),
        borderRadius: scaleFont(6),
        marginLeft: scaleFont(8),
    },
    waitingBadgeText: {
        color: '#B45309',
        fontSize: scaleFont(11),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },

    promiseListSection: {
        marginBottom: scaleFont(16),
    },
    sectionTitle: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_700Bold',
    },
});
