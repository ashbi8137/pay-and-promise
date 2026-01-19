import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function PrivacySecurityScreen() {
    const router = useRouter();

    const handleLogout = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out from all devices?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) Alert.alert('Error', error.message);
                    else router.replace('/screens/AuthScreen');
                }
            }
        ]);
    };

    const handleChangePassword = () => {
        Alert.alert('Change Password', 'To change your password, please sign out and use the "Forgot Password" link on the login screen.');
    };

    const handleDataDeletion = () => {
        Linking.openURL('mailto:support.pnp@gmail.com?subject=Data Deletion Request');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy & Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. Data Security */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="lock-closed" size={24} color="#4F46E5" />
                        <Text style={styles.cardTitle}>Data Security</Text>
                    </View>
                    <Text style={styles.cardText}>
                        Your data is securely stored and protected using modern authentication and security practices. We use Supabase RLS (Row Level Security) to ensure only you can access your private data.
                    </Text>
                </View>

                {/* 2. Data Usage */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="analytics" size={24} color="#0EA5E9" />
                        <Text style={styles.cardTitle}>Data Usage</Text>
                    </View>
                    <Text style={styles.cardText}>
                        We only collect the information necessary to run the app (email, name, and promise data). We never sell or misuse your data.
                    </Text>
                </View>

                {/* 3. Data Deletion */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="trash" size={24} color="#EF4444" />
                        <Text style={styles.cardTitle}>Data Deletion</Text>
                    </View>
                    <Text style={styles.cardText}>
                        You have full control. You can request complete account deletion at any time, which will wipe all your personal data from our servers.
                    </Text>
                </View>


                {/* Account Control Section */}
                <Text style={styles.sectionHeader}>Account Control</Text>

                <TouchableOpacity style={styles.actionRow} onPress={handleChangePassword}>
                    <Text style={styles.actionText}>Change Password</Text>
                    <Ionicons name="key-outline" size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Logout from all devices</Text>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </TouchableOpacity>

                {/* Bottom Links */}
                <View style={styles.bottomLinks}>
                    <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/screens/PrivacyPolicyScreen')}>
                        <Text style={styles.linkText}>View Privacy Policy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.linkButton, styles.deleteButton]} onPress={handleDataDeletion}>
                        <Text style={[styles.linkText, { color: '#EF4444' }]}>Request Data Deletion</Text>
                    </TouchableOpacity>
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
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    cardText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 22,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 12,
        marginLeft: 4,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    actionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
    },
    bottomLinks: {
        marginTop: 24,
        gap: 12,
    },
    linkButton: {
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    deleteButton: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4F46E5',
    },
});
