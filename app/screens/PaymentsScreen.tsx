import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function PaymentsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [upiId, setUpiId] = useState('');
    const [savingUpi, setSavingUpi] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            fetchUpiData();
        }, [])
    );

    const fetchUpiData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('upi_id')
                .eq('id', user.id)
                .single();

            if (profileData?.upi_id) {
                setUpiId(profileData.upi_id);
                setIsEditing(false);
                setIsFirstTime(false);
            } else {
                setUpiId('');
                setIsEditing(true);
                setIsFirstTime(true);
            }
        } catch (error) {
            console.error('Error loading UPI data:', error);
            Alert.alert('Error', 'Failed to load payment settings');
        } finally {
            setLoading(false);
        }
    };

    const saveUpiId = async () => {
        if (!upiId.trim()) {
            Alert.alert("Required", "Please enter a valid UPI ID");
            return;
        }

        if (!upiId.includes('@')) {
            Alert.alert("Invalid Format", "UPI ID must contain '@'");
            return;
        }

        setSavingUpi(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ upi_id: upiId })
                .eq('id', user.id);

            if (error) {
                Alert.alert("Error", "Failed to save UPI ID");
            } else {
                Alert.alert("Success", "UPI ID saved successfully");
                setIsEditing(false);
                setIsFirstTime(false);
            }
        } catch (err) {
            Alert.alert("Error", "Something went wrong");
        } finally {
            setSavingUpi(false);
        }
    };

    const getMaskedUpi = (id: string) => {
        if (!id) return '';
        const parts = id.split('@');
        if (parts.length !== 2) return id; // Fallback if format is weird

        const [userPart, domainPart] = parts;
        if (userPart.length <= 3) {
            return userPart + '*****@' + domainPart;
        }

        const visible = userPart.slice(0, 3);
        const masked = visible + '*****@' + domainPart;
        return masked;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payments</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="qr-code-outline" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.cardTitle}>UPI ID</Text>
                        </View>

                        {!isEditing ? (
                            <View style={styles.displayContainer}>
                                <Text style={styles.maskedText}>{getMaskedUpi(upiId)}</Text>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => setIsEditing(true)}
                                >
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.editContainer}>
                                <Text style={styles.label}>Enter your UPI ID</Text>
                                <TextInput
                                    value={upiId}
                                    onChangeText={setUpiId}
                                    placeholder="e.g. name@oksbi"
                                    style={styles.input}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                {isFirstTime && (
                                    <View style={styles.infoBox}>
                                        <Ionicons name="information-circle-outline" size={20} color="#4F46E5" />
                                        <Text style={styles.infoText}>
                                            Your UPI ID is used only to help peers pay you directly.
                                            Pay & Promise never processes or stores payments.
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.actionButtons}>
                                    {!isFirstTime && (
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                setIsEditing(false);
                                                fetchUpiData(); // Reset to saved value
                                            }}
                                            disabled={savingUpi}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.saveButton, savingUpi && { opacity: 0.7 }]}
                                        onPress={saveUpiId}
                                        disabled={savingUpi}
                                    >
                                        {savingUpi ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Save</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
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
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 45 : 16,
        paddingBottom: 24,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    content: {
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F0F9FF', // Light blue bg
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    displayContainer: {
        marginTop: 4,
    },
    maskedText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    editButton: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
    },
    editButtonText: {
        color: '#475569',
        fontWeight: '600',
        fontSize: 14,
    },
    editContainer: {
        marginTop: 0,
    },
    label: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#0F172A',
        backgroundColor: '#F8FAFC',
        marginBottom: 16,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#4338CA',
        lineHeight: 18,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#64748B',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
