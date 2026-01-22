import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function TransactionHistoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState<any[]>([]);



    useFocusEffect(
        React.useCallback(() => {
            fetchHistory();
        }, [])
    );

    const fetchHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Ledger History with promise details
            const { data: ledger, error } = await supabase
                .from('ledger')
                .select('amount, type, description, created_at, promise_id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch promise titles for the ledger entries
            if (ledger && ledger.length > 0) {
                const promiseIds = [...new Set(ledger.map(l => l.promise_id).filter(Boolean))];

                let promiseTitles: Record<string, string> = {};
                if (promiseIds.length > 0) {
                    const { data: promises } = await supabase
                        .from('promises')
                        .select('id, title')
                        .in('id', promiseIds);

                    if (promises) {
                        promises.forEach(p => {
                            promiseTitles[p.id] = p.title;
                        });
                    }
                }

                // Enrich ledger with promise titles
                const enrichedHistory = ledger.map(item => ({
                    ...item,
                    promise_title: item.promise_id ? promiseTitles[item.promise_id] : null
                }));

                setHistory(enrichedHistory);
            } else {
                setHistory([]);
            }

        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, []);

    const formatCurrency = (amount: number) => {
        return '₹ ' + Math.abs(amount).toFixed(0);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaction History</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4338ca" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {history.length === 0 ? (
                        <View style={styles.centerContent}>
                            <Text style={styles.emptyText}>No transactions yet.</Text>
                        </View>
                    ) : (
                        history.map((item, index) => (
                            <View key={index} style={styles.historyCard}>
                                {item.promise_title && (
                                    <Text style={styles.promiseTag}>{item.promise_title}</Text>
                                )}
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyDate}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                    <Text style={[
                                        styles.historyAmount,
                                        item.type === 'winnings' ? styles.textGreen : styles.textRed
                                    ]}>
                                        {item.type === 'winnings' ? '+' : '-'} {formatCurrency(item.amount)}
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.historyDesc,
                                    item.type === 'winnings' ? styles.descGreen : styles.descRed
                                ]}>
                                    {item.description}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 60 : 40,
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    historyDate: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    historyDesc: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    textGreen: { color: '#16A34A' },
    textRed: { color: '#DC2626' },
    descGreen: { color: '#15803D' },
    descRed: { color: '#B91C1C' },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
    },
    promiseTag: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4338ca',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
        overflow: 'hidden',
    },
});
