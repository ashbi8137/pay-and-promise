import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TermsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms & Conditions</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
                    <Text style={styles.paragraph}>
                        By downloading, accessing, or using the Pay & Promise mobile application (the "App"), you agree to be bound by these Terms and Conditions. If you do not agree, strictly do not use the App.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. App Functionality</Text>
                    <Text style={styles.paragraph}>
                        Pay & Promise is a social accountability tool designed to help users track habits and commitments ("Promises"). The financial penalties or rewards simulated or tracked within the app are agreed upon by the users themselves.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. User Responsibility</Text>
                    <Text style={styles.paragraph}>
                        You are solely responsible for:
                        {"\n\n"}
                        • The commitments you make within the App.
                        {"\n"}
                        • Any financial transactions you choose to settle outside the App based on the App's records.
                        {"\n"}
                        • Maintaining the confidentiality of your account login information.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
                    <Text style={styles.paragraph}>
                        We are not a bank, financial institution, or legal enforcer of promises. Pay & Promise is a tracking tool. We are not liable for:
                        {"\n\n"}
                        • Any financial losses incurred as a result of using the App.
                        {"\n"}
                        • Disputes between users (Promisers and Verifiers).
                        {"\n"}
                        • Failed habit formations or personal damages.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Fraud & Abuse</Text>
                    <Text style={styles.paragraph}>
                        We reserve the right to suspend or terminate accounts that we suspect of fraudulent activity, harassment, or abuse of the platform mechanisms.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Changes to Terms</Text>
                    <Text style={styles.paragraph}>
                        We reserve the right to modify these terms at any time. Continued use of the App following any changes constitutes acceptance of the new terms.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Contact</Text>
                    <Text style={styles.paragraph}>
                        For legal inquiries, contact: <Text style={styles.bold}>support.pnp@gmail.com</Text>
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 45 : 16,
        paddingBottom: 24,
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
    lastUpdated: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    bold: {
        fontWeight: '700',
        color: '#334155',
    },
});
