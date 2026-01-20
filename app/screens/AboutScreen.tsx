import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AboutScreen() {
    const router = useRouter();

    const handleEmail = () => {
        Linking.openURL('mailto:support.pnp@gmail.com');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Branding Section */}
                <View style={styles.brandSection}>
                    <View style={styles.logoContainer}>
                        {/* Using explicit require or Image source if properly configured, else a placeholder icon */}
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.appName}>Pay & Promise</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                </View>

                {/* Team Info */}
                <View style={styles.devCard}>
                    <Text style={styles.devLabel}>Team Behind Pay & Promise</Text>

                    <View style={styles.teamMember}>
                        <Text style={styles.devName}>Ashbin P A</Text>
                        <Text style={styles.devRole}>Founder & Developer</Text>
                    </View>

                    <View style={styles.teamDivider} />

                    <View style={styles.teamMember}>
                        <Text style={styles.devName}>Rahul</Text>
                        <Text style={styles.devRole}>Chief Marketing Head (CMH)</Text>
                    </View>
                </View>

                {/* Tagline */}
                <View style={styles.quoteContainer}>
                    <Ionicons name="chatbubbles-outline" size={24} color="#CBD5E1" style={styles.quoteIcon} />
                    <Text style={styles.tagline}>
                        “If you’re serious about changing your habits, this app will make sure your promises finally mean something.”
                    </Text>
                </View>

                {/* Contact Section */}
                <View style={styles.contactSection}>
                    <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
                        <View style={styles.contactIconCircle}>
                            <Ionicons name="mail" size={20} color="#4F46E5" />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Support & Business</Text>
                            <Text style={styles.contactValue}>support.pnp@gmail.com</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                </View>

                {/* Legal Buttons */}
                <View style={styles.legalRow}>
                    <TouchableOpacity style={styles.legalButton} onPress={() => router.push('/screens/PrivacyPolicyScreen')}>
                        <Text style={styles.legalButtonText}>Privacy Policy</Text>
                    </TouchableOpacity>

                    <View style={styles.legalDivider} />

                    <TouchableOpacity style={styles.legalButton} onPress={() => router.push('/screens/TermsScreen')}>
                        <Text style={styles.legalButtonText}>Terms & Conditions</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.copyright}>© 2026 Pay & Promise. All rights reserved.</Text>

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
        backgroundColor: '#F8FAFC', // Match background
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 24,
    },
    appName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    version: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    devCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        padding: 24,
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    devLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 16,
        textAlign: 'center',
    },
    teamMember: {
        alignItems: 'center',
    },
    teamDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
        width: '60%',
        alignSelf: 'center',
    },
    devName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    devRole: {
        fontSize: 14,
        color: '#64748B',
    },
    quoteContainer: {
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    quoteIcon: {
        alignSelf: 'center',
        marginBottom: 8,
        opacity: 0.5,
    },
    tagline: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 24,
    },
    contactSection: {
        width: '100%',
        marginBottom: 24,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    contactIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contactLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600',
    },
    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginBottom: 32,
    },
    legalButton: {
        paddingVertical: 8,
    },
    legalButtonText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    legalDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#CBD5E1',
    },
    copyright: {
        fontSize: 11,
        color: '#CBD5E1',
    },
});
