import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
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
    status: string;
    created_at: string;
}

export default function HomeScreen() {
    const router = useRouter();
    const [firstName, setFirstName] = useState<string>('Ashbin');
    const [activePromises, setActivePromises] = useState<PromiseItem[]>([]);
    const [completedPromises, setCompletedPromises] = useState<PromiseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch User and Promises when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        setLoading(true);
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

                // 1. Fetch All Active Promises
                const { data: promises, error: promiseError } = await supabase
                    .from('promises')
                    .select('*')
                    .eq('created_by', user.id)
                    .eq('status', 'active') // Only fetch active promises
                    .order('created_at', { ascending: false });

                // 2. Fetch Today's Checkins
                const today = new Date().toISOString().split('T')[0];
                const { data: checkins, error: checkinError } = await supabase
                    .from('daily_checkins')
                    .select('promise_id, status')
                    .eq('user_id', user.id)
                    .eq('date', today);

                if (promiseError) console.error('Promise fetch error:', promiseError);
                if (checkinError) console.error('Checkin fetch error:', checkinError);

                if (promises) {
                    const todayCheckinMap = new Map();
                    checkins?.forEach(c => todayCheckinMap.set(c.promise_id, c.status));

                    const pending = [];
                    const doneToday = [];

                    for (const p of promises) {
                        if (todayCheckinMap.has(p.id)) {
                            // It has been checked in today
                            const status = todayCheckinMap.get(p.id);
                            // Attach temporary status for display
                            doneToday.push({ ...p, status: status === 'done' ? 'completed' : 'failed' });
                        } else {
                            // Not checked in yet
                            pending.push(p);
                        }
                    }

                    setActivePromises(pending);
                    setCompletedPromises(doneToday);
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

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            router.replace('/screens/AuthScreen');
        }
    };

    const renderCard = (item: PromiseItem, isHistory: boolean) => {
        const currentDay = 1;
        const totalDays = item.duration_days;
        const progressPercent = isHistory ? 100 : (currentDay / totalDays) * 100;
        const isFailed = item.status === 'failed';

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => handlePromisePress(item)}
            >
                <View style={[styles.card, isHistory && styles.completedCard]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.cardTitle, isHistory && styles.completedText]}>{item.title}</Text>
                            <Text style={styles.cardSubtitle}>
                                {isHistory ? (isFailed ? 'Failed' : 'Completed') : `Day ${currentDay} of ${totalDays}`}
                            </Text>
                            <Text style={styles.cardMeta}>
                                ₹{item.amount_per_person}/person • {item.participants?.length || 0} participants
                            </Text>
                        </View>
                        <View style={
                            item.status === 'active' ? styles.activeBadge :
                                item.status === 'failed' ? styles.failedBadge : styles.completedBadge
                        }>
                            <Text style={
                                item.status === 'active' ? styles.activeBadgeText :
                                    item.status === 'failed' ? styles.failedBadgeText : styles.completedBadgeText
                            }>
                                {item.status === 'active' ? 'Active' : (item.status === 'failed' ? 'Failed' : 'Done')}
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progressPercent}%` },
                                item.status === 'completed' && { backgroundColor: '#94A3B8' }, // Grey for completed
                                isFailed && { backgroundColor: '#EF4444' } // Red for failed
                            ]}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >

                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingText}>Good Morning 👋</Text>
                        <Text style={styles.nameText}>{firstName}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
                        <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* Primary CTA */}
                <TouchableOpacity onPress={handleCreatePromise} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#0F172A', '#4338ca']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ctaButton}
                    >
                        <Ionicons name="add" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.ctaText}>Create New Promise</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Active Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Active Promises</Text>
                    {activePromises.length > 0 ? (
                        activePromises.map(item => renderCard(item, false))
                    ) : (
                        <Text style={styles.emptyText}>
                            {loading ? 'Loading...' : 'No active promises found.'}
                        </Text>
                    )}
                </View>

                {/* Completed Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Completed Today</Text>
                    {completedPromises.length > 0 ? (
                        completedPromises.map(item => renderCard(item, true))
                    ) : (
                        <Text style={styles.emptyText}>
                            {loading ? 'Loading...' : 'No promises completed yet today.'}
                        </Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10,
    },
    greetingText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 30,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    logoutIcon: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginBottom: 40,
        shadowColor: '#4338ca',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 16,
        paddingLeft: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    cardMeta: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    activeBadge: {
        backgroundColor: '#DCFCE7', // Light Green
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeBadgeText: {
        color: '#166534', // Dark Green
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22C55E', // Green Accent
        borderRadius: 3,
    },
    emptyText: {
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    // Completed Styles
    completedCard: {
        opacity: 0.8,
        backgroundColor: '#F8FAFC',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#94A3B8',
    },
    completedBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    completedBadgeText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
    },
    // Failed Styles
    failedBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    failedBadgeText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700',
    },
});
