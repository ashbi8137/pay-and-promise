import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function PromiseDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse the promise data from params
    const promiseData = params.promise ? JSON.parse(params.promise as string) : null;

    if (!promiseData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Promise details not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Removed description from destructuring
    const { title, duration, numPeople, amountPerPerson, totalAmount, participants } = promiseData;

    const handleCheckIn = (status: 'done' | 'failed') => {
        Alert.alert('Check-in', `Marked as ${status}. Daily check-in logic will be enforced later.`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Main Details Card */}
                <View style={styles.card}>
                    {/* Description Section Removed */}

                    <View style={styles.row}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValue}>{duration} Days</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Stake / Person</Text>
                            <Text style={styles.statValue}>₹ {amountPerPerson}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total Pool</Text>
                        <Text style={styles.totalValue}>₹ {totalAmount}</Text>
                    </View>
                </View>

                {/* Participants */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Participants ({participants?.length || 0})</Text>
                    <View style={styles.participantsList}>
                        {participants?.map((p: any, index: number) => (
                            <View key={index} style={styles.participantChip}>
                                <Ionicons name="person-circle" size={20} color="#64748B" />
                                <Text style={styles.participantText}>{p.name || p}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Daily Check-in */}
                <View style={styles.checkInSection}>
                    <Text style={styles.checkInTitle}>Daily Check-in</Text>
                    <Text style={styles.checkInSubtitle}>Have you stuck to your promise today?</Text>

                    <View style={styles.checkInButtons}>
                        <TouchableOpacity
                            style={[styles.checkInButton, styles.successButton]}
                            onPress={() => handleCheckIn('done')}
                        >
                            <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Mark as Done</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.checkInButton, styles.failButton]}
                            onPress={() => handleCheckIn('failed')}
                        >
                            <Ionicons name="close-circle-outline" size={24} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Mark as Failed</Text>
                        </TouchableOpacity>
                    </View>
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
        paddingTop: 80, // Increased top spacing
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerBackButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    totalContainer: {
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 12,
    },
    totalLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    participantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    participantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    participantText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    checkInSection: {
        marginTop: 8,
    },
    checkInTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    checkInSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
    },
    checkInButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    checkInButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    successButton: {
        backgroundColor: '#22C55E', // Green
    },
    failButton: {
        backgroundColor: '#EF4444', // Red
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#334155',
        fontWeight: '600',
    }
});
