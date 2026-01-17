import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Mock Data Interfaces
interface PromiseItem {
    id: string;
    title: string;
    currentDay: number;
    totalDays: number;
    status: 'Active' | 'Completed';
}

export default function HomeScreen() {
    const router = useRouter();
    const [firstName, setFirstName] = useState<string>('User');

    // Mock Data
    const activePromises: PromiseItem[] = [
        { id: '1', title: 'Wake up at 6 AM', currentDay: 2, totalDays: 7, status: 'Active' },
        { id: '2', title: 'No Sugar Challenge', currentDay: 5, totalDays: 30, status: 'Active' },
    ];

    const completedPromises: PromiseItem[] = [
        { id: '3', title: 'Read a Book', currentDay: 14, totalDays: 14, status: 'Completed' },
    ];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const metadataName = user.user_metadata?.full_name;
                if (metadataName) {
                    // Extract first name for a friendlier greeting
                    setFirstName(metadataName.split(' ')[0]);
                } else if (user.email) {
                    setFirstName(user.email.split('@')[0]);
                }
            }
        } catch (error) {
            console.log('Error fetching user:', error);
        }
    };

    const handleCreatePromise = () => {
        Alert.alert('Coming Soon', 'Create Promise functionality will be added next!');
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            router.replace('/screens/AuthScreen');
        }
    };

    const renderActiveCard = (item: PromiseItem) => {
        const progressPercent = (item.currentDay / item.totalDays) * 100;

        return (
            <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSubtitle}>Day {item.currentDay} of {item.totalDays}</Text>
                    </View>
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>
        );
    };

    const renderCompletedCard = (item: PromiseItem) => (
        <View key={item.id} style={[styles.card, styles.completedCard]}>
            <View style={styles.cardHeader}>
                <Text style={styles.completedTitle}>{item.title}</Text>
                <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#64748B" />
                    <Text style={styles.completedBadgeText}>Done</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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

                {/* Primary CTA - Floating Style */}
                <TouchableOpacity onPress={handleCreatePromise} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#0F172A', '#4338ca']} // Dark Navy to Indigo/Purple
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
                        activePromises.map(renderActiveCard)
                    ) : (
                        <Text style={styles.emptyText}>No active promises currently.</Text>
                    )}
                </View>

                {/* Completed Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Completed</Text>
                    {completedPromises.length > 0 ? (
                        completedPromises.map(renderCompletedCard)
                    ) : (
                        <Text style={styles.emptyText}>No completed promises yet.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Light Grey Background
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60, // Increased to move content down approx 1cm visual equivalent
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
        color: '#64748B', // Secondary Text
        fontWeight: '500',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 30,
        fontWeight: '800',
        color: '#0F172A', // Primary Navy
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
    completedCard: {
        backgroundColor: '#F8FAFC', // Slightly faded for completed
        opacity: 0.8,
    },
    completedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        textDecorationLine: 'line-through',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    completedBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    emptyText: {
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
});
