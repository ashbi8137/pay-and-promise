import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const router = useRouter();

    const navigateTo = (path: string) => {
        router.push(path as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Account Section */}
                <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/ProfileScreen')}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="person" size={20} color="#4F46E5" />
                        </View>
                        <Text style={styles.rowLabel}>Account</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                {/* Help & Support */}
                <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/SupportScreen')}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="help-circle" size={20} color="#16A34A" />
                        </View>
                        <Text style={styles.rowLabel}>Help & Support</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                {/* Privacy & Security */}
                <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/PrivacySecurityScreen')}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
                            <Ionicons name="shield-checkmark" size={20} color="#DC2626" />
                        </View>
                        <Text style={styles.rowLabel}>Privacy & Security</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                {/* About Pay & Promise */}
                <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/AboutScreen')}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
                            <Ionicons name="information-circle" size={20} color="#64748B" />
                        </View>
                        <Text style={styles.rowLabel}>About Pay & Promise</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
});
