import { Ionicons } from '@expo/vector-icons';
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
import { Colors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

// Data Interface matching Supabase Schema
interface PromiseItem {
    id: string;
    title: string;
    description?: string;
    duration_days: number;
    number_of_people: number;
    amount_per_person: number;
    total_amount: number;
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

    // Tooltip State
    // Tooltip State
    const [showTooltip, setShowTooltip] = useState(false);
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;

    // Swing Animation for Date Tag
    const rotation = useSharedValue(0);

    useEffect(() => {
        checkTooltip();
        startPulse();
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

                // 3. Fetch Today's Settlements (Group Status)
                // If a promise is in this table for today, it means everyone is verified/accounted for.
                let settledPromiseIds = new Set();
                if (promises.length > 0) {
                    const promiseIds = promises.map(p => p.id);
                    const { data: settlements, error: settlementError } = await supabase
                        .from('daily_settlements')
                        .select('promise_id')
                        .in('promise_id', promiseIds)
                        .eq('date', today);

                    if (settlementError) console.error('Settlement fetch error:', settlementError);
                    if (settlements) {
                        settledPromiseIds = new Set(settlements.map(s => s.promise_id));
                    }
                }

                if (promises) {
                    const todayCheckinMap = new Map();
                    checkins?.forEach(c => todayCheckinMap.set(c.promise_id, c.status));

                    const pending: PromiseItem[] = [];
                    const done: PromiseItem[] = [];
                    const justCompleted: PromiseItem[] = [];

                    for (const p of promises) {
                        // 1. If Promise is finalized (Completed/Failed entirely), it goes to Completed Tab
                        // NOTE: p.status comes from the 'promises' table (active/completed/failed)
                        if (p.status !== 'active') {
                            done.push(p);
                            // Check if promise was completed recently (check created_at + duration)
                            const startDate = new Date(p.created_at);
                            const endDate = new Date(startDate);
                            endDate.setDate(startDate.getDate() + p.duration_days);
                            const now = new Date();
                            // If promise ended within the last 24 hours, show congratulations
                            const hoursSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60);
                            if (p.status === 'completed' && hoursSinceEnd >= 0 && hoursSinceEnd < 24) {
                                justCompleted.push(p);
                            }
                            continue;
                        }

                        // 2. If Active, check if the DAY is settled (Group Complete)
                        if (settledPromiseIds.has(p.id)) {
                            // The day is fully settled! Move to Completed Tab for today.
                            // We use my personal status for the badge (completed/failed)
                            const myStatus = todayCheckinMap.get(p.id);
                            // If I didn't verify but day is settled, I must have been auto-failed or rejected
                            done.push({ ...p, status: (myStatus === 'done' || myStatus === 'verified') ? 'completed' : 'failed' });
                        } else {
                            // Day is NOT settled yet. Stays in "In Progress".
                            // But I might have finished my part.
                            if (todayCheckinMap.has(p.id)) {
                                const myStatus = todayCheckinMap.get(p.id);
                                // I am done, but waiting for others.
                                // We can use a special status string to show a different badge UI if needed, 
                                // or just keep it 'active' but maybe show "Waiting..." text.
                                // For now, let's keep it in pending.
                                // We'll add a temporary property 'waitingForOthers' if we want to show a badge.
                                // Effectively, it's still "Active" in the list.
                                pending.push({ ...p, status: 'active_waiting' }); // active_waiting is a UI hint
                            } else {
                                // I haven't done it yet.
                                pending.push(p);
                            }
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 5) return 'Good evening'; // Late night is still evening extended
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const getDailyQuote = () => {
        const quotes = [
            "Start with one small, honest commitment today.",
            "Consistency is the code to success.",
            "Your word is your most valuable asset.",
            "Small promises kept lead to big trust earned.",
            "Focus on the step in front of you, not the whole staircase.",
            "Discipline is doing what needs to be done, even if you don't want to.",
            "Success is the sum of small efforts, repeated day in and day out.",
            "The only bad workout is the one that didn't happen.",
            "Don't wish for it. Work for it.",
            "Action is the foundational key to all success."
        ];
        // Use day of year to rotate quotes
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 0);
        const diff = (today.getTime() - start.getTime()) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        return quotes[dayOfYear % quotes.length];
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
            case 'custom': return 'sparkles';
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
            amountPerPerson: item.amount_per_person,
            totalAmount: item.total_amount,
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
                            <Ionicons
                                name={getGoalIcon(item.description, item.status) as any}
                                size={24}
                                color={item.status === 'failed' ? '#EF4444' :
                                    (item.status === 'completed' ? '#94A3B8' : getGoalColor(item.description))}
                            />
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
                                    <Text style={[styles.cardMeta, { color: theme.icon }]}>₹{item.amount_per_person}</Text>
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
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" colors={['#4F46E5']} />
                    }
                >

                    {/* TYPOGRAPHIC HERO HEADER */}
                    <View style={styles.heroHeaderContainer}>
                        <View style={styles.typographyBlock}>
                            <Text style={styles.greetingLight}>{getGreeting().split(' ')[0]}</Text>
                            <Text style={styles.greetingFocus}>{getGreeting().split(' ')[1] || 'DAY'}</Text>
                            <Text style={styles.userNameHero}>{firstName || 'Agent'}.</Text>
                        </View>

                        {/* HANGING SWING DATE TAG */}
                        <View style={styles.hangingContainer}>
                            {/* The String */}
                            <View style={styles.hangingThread} />
                            {/* The Tag */}
                            <Animated.View style={[styles.swingingTag, animatedSwingStyle]}>
                                <View style={styles.tagHole} />
                                <Text style={styles.tagDayNum}>
                                    {new Date().getDate().toString().padStart(2, '0')}
                                </Text>
                                <Text style={styles.tagMonth}>
                                    {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                </Text>
                            </Animated.View>
                        </View>
                    </View>

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
                                    <Text style={styles.heroTitle}>Keep the momentum!</Text>
                                    <Text style={styles.heroSubtitle}>
                                        {activePromises.length > 0
                                            ? `You have ${activePromises.length} active promises to verify.`
                                            : "Start a new promise to build your trust score."}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.heroButton}
                                        onPress={() => activePromises.length > 0 ? router.push('/screens/ScoreboardScreen') : router.push('/(tabs)/create')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.heroButtonText}>
                                            {activePromises.length > 0 ? "View Scoreboard" : "Create Promise"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {/* Decorative Icon */}
                                <Ionicons name="trophy" size={80} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
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
                                style={{ marginRight: 32 }}
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
                                    <View style={[styles.emptyStateIconContainer, { backgroundColor: '#F8FAFC' }]}>
                                        <Ionicons name="sparkles-outline" size={32} color="#64748B" />
                                    </View>
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

            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.fabMain}
                    onPress={handleCreatePromise}
                    activeOpacity={1}
                >
                    <Ionicons name="add" size={28} color="#1E3A8A" />
                </TouchableOpacity>
            </View>

            {/* TOOLTIP OVERLAY */}
            {
                showTooltip && (
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.tooltipOverlay}
                        onPress={dismissTooltip}
                    >
                        <View style={styles.tooltipBubble}>
                            <Text style={styles.tooltipTitle}>Start Here!</Text>
                            <Text style={styles.tooltipText}>Create your first promise to verify.</Text>
                            <View style={styles.tooltipArrow} />
                        </View>
                    </TouchableOpacity>
                )
            }
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor handled dynamically
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 80 : 60,
        paddingBottom: 40,
    },
    // HERO TYPOGRAPHY HEADER
    heroHeaderContainer: {
        marginBottom: 32,
        paddingTop: 10,
        flexDirection: 'row', // Side by side
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    // SWING DATE TAG
    hangingContainer: {
        alignItems: 'center',
        marginRight: 28, // Moved toward left (away from edge)
        marginTop: -60, // Pull up significantly so rope starts off-screen
    },
    hangingThread: {
        width: 2,
        height: 100, // Long rope
        backgroundColor: '#CBD5E1', // Slightly darker thread for visibility
        marginBottom: -8, // Overlap with tag
    },
    swingingTag: {
        backgroundColor: '#FFFFFF',
        width: 68, // Bigger
        paddingVertical: 14,
        borderRadius: 14, // Slightly softer
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        // Shadow for depth
        shadowColor: '#475569',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    tagHole: {
        width: 10, // Bigger hole
        height: 10,
        borderRadius: 5,
        backgroundColor: '#CBD5E1',
        position: 'absolute',
        top: 8,
    },
    tagDayNum: {
        fontSize: 28, // Bigger number
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 8,
        lineHeight: 28,
    },
    tagMonth: {
        fontSize: 12, // Bigger month
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginTop: 3,
        letterSpacing: 1,
    },
    typographyBlock: {
        gap: -5,
    },
    greetingLight: {
        fontSize: 32,
        fontWeight: '300',
        color: '#64748B',
        letterSpacing: -0.5,
    },
    greetingFocus: {
        fontSize: 48, // HUGE
        fontWeight: '900', // BLACK weight
        color: '#0F172A',
        letterSpacing: -1,
        textTransform: 'uppercase',
        lineHeight: 56, // Tight line height
    },
    userNameHero: {
        fontSize: 32,
        fontWeight: '400',
        color: '#4F46E5', // Brand Accent
    },

    // HERO CARD
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroTextContainer: {
        flex: 1,
        marginRight: 16,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 20,
        lineHeight: 20,
    },
    heroButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    heroButtonText: {
        color: '#4F46E5',
        fontWeight: '700',
        fontSize: 13,
    },

    // MICRO STATS
    microStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    microStatsText: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.6,
        letterSpacing: 0.5,
    },

    // EDITORIAL TABS (Luxury)
    editorialTabs: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 28,
        paddingHorizontal: 8,
    },
    editorialTabTitle: {
        fontSize: 24,
        fontWeight: '700', // Modern Bold
        letterSpacing: -0.5,
        color: '#1E293B',
    },
    activeIndicator: {
        height: 2, // Thinner
        width: 32,
        marginTop: 8,
    },

    card: {
        borderRadius: 20, // Slightly more rounded
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center', // Align icon box and content
        padding: 12, // Reduced outer padding
        // Soft UI
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 1,
        borderWidth: 0,
    },
    cardIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16, // Soft square
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12, // Space between icon and content
    },
    cardContent: {
        flex: 1,
        paddingVertical: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        color: '#1E293B',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12, // Modern gap spacing
    },
    daysTag: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    daysTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    cardMeta: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94A3B8',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dotSeparator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 8,
    },

    // TRUST FOOTER
    trustFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 48,
        gap: 8,
        opacity: 0.4,
    },
    trustText: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // EMPTY STATS (Luxury)
    emptyStateContainer: {
        paddingVertical: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        opacity: 0.8,
    },
    emptyStateTitleLuxury: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
        color: '#1E293B',
    },
    emptyStateTextLuxury: {
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
        letterSpacing: 0.5,
        opacity: 0.5,
        textTransform: 'uppercase',
    },
    activeBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    activeBadgeText: {
        color: '#166534',
        fontSize: 11,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginTop: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 5,
    },
    completedCard: {
        opacity: 0.7,
    },
    completedText: {
        textDecorationLine: 'line-through',
    },
    completedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    completedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    failedBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    failedBadgeText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '700',
    },
    waitingBadge: {
        backgroundColor: '#FEF9C3',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    waitingBadgeText: {
        color: '#B45309',
        fontSize: 11,
        fontWeight: '700',
    },

    // Promise List Section Styles
    promiseListSection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    // FAB & Tooltip Styles (Luxury: Hollow/Gradient Look)
    fabContainer: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    fabMain: {
        width: 60, // Slightly smaller for better fit
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        // Refined shadow (less extreme)
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(30, 58, 138, 0.05)',
    },
    pulseRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#818CF8', // Indigo-400
        opacity: 0.5,
    },
    tooltipOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0, // Cover entire screen
        backgroundColor: 'rgba(0,0,0,0.3)', // Dim background
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 110, // Above FAB
        zIndex: 60,
    },
    tooltipBubble: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        elevation: 6,
        marginBottom: 8,
    },
    tooltipTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    tooltipText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    tooltipArrow: {
        position: 'absolute',
        bottom: -8,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
    },
});
