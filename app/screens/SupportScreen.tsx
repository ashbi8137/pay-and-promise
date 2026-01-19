import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SupportScreen() {
    const router = useRouter();

    const handleContact = (subject: string) => {
        Linking.openURL(`mailto:support.pnp@gmail.com?subject=${subject}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>We’re here to help you.</Text>
                    <Text style={styles.heroSubtitle}>Choose an option below to get in touch.</Text>
                </View>

                {/* Contact Option */}
                <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Support Request')}>
                    <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="mail" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>Contact Support</Text>
                        <Text style={styles.optionDesc}>Email us for general inquiries.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                {/* FAQ Option */}
                {/* Since we don't have a dedicated FAQ content yet, let's treat this as 'General Questions' email for now or a placeholder */}
                <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Question regarding Pay & Promise')}>
                    <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="chatbubbles" size={24} color="#16A34A" />
                    </View>
                    <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>Frequently Asked Questions</Text>
                        <Text style={styles.optionDesc}>Get answers to common questions.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>


                {/* Bug Option */}
                <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Bug Report')}>
                    <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="bug" size={24} color="#EF4444" />
                    </View>
                    <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>Report a Bug</Text>
                        <Text style={styles.optionDesc}>Found an issue? Let us know.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                {/* Feature Option */}
                <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Feature Request')}>
                    <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                        <Ionicons name="bulb" size={24} color="#F97316" />
                    </View>
                    <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>Suggest a Feature</Text>
                        <Text style={styles.optionDesc}>Help us improve the app.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                <Text style={styles.footerNote}>We usually respond within 24 hours.</Text>

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
    hero: {
        marginBottom: 32,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#64748B',
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700', // Bold
        color: '#0F172A',
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 13,
        color: '#64748B',
    },
    footerNote: {
        marginTop: 24,
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 14,
        fontStyle: 'italic',
    },
});
