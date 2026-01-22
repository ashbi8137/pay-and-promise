import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Last Updated: January 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Introduction</Text>
                    <Text style={styles.paragraph}>
                        Welcome to Pay & Promise ("we," "our," or "us"). We are committed to protecting your privacy and ensuring your personal information is handled in a safe and responsible manner. This policy outlines how we collect, use, and protect your data.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                        We collect the following types of information to provide our service:
                        {"\n\n"}
                        • <Text style={styles.bold}>Account Information:</Text> Your name, email address, and profile picture.
                        {"\n"}
                        • <Text style={styles.bold}>Usage Data:</Text> Information about your promises, check-ins, and interactions within the app.
                        {"\n"}
                        • <Text style={styles.bold}>Device Information:</Text> Device type, operating system, and unique device identifiers for crash reporting and analytics.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. How We Use Your Data</Text>
                    <Text style={styles.paragraph}>
                        We use your data strictly to:
                        {"\n\n"}
                        • Create and manage your account.
                        {"\n"}
                        • Facilitate the "Promise" tracking and verification functionality.
                        {"\n"}
                        • Send necessary notifications regarding your promises.
                        {"\n"}
                        • Improve app performance and fix bugs.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
                    <Text style={styles.paragraph}>
                        All data is stored securely on servers provided by Supabase. We implement industry-standard encryption and security measures (Row Level Security) to protect your information from unauthorized access. However, no method of transmission over the internet is 100% secure.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Data Sharing</Text>
                    <Text style={styles.paragraph}>
                        We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Your Rights & Data Deletion</Text>
                    <Text style={styles.paragraph}>
                        You have the right to access, correct, or delete your personal data. You can request complete account deletion at any time by contacting us or using the "Request Data Deletion" option in the app settings. Upon request, we will permanently remove all your data from our systems.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Contact Us</Text>
                    <Text style={styles.paragraph}>
                        If you have any questions about this Privacy Policy, please contact us at:
                        {"\n\n"}
                        <Text style={styles.bold}>payandpromise@gmail.com</Text>
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
