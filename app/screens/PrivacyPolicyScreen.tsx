import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy Policy</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.policyCard}>
                        <Text style={styles.lastUpdated}>Effective Date: January 2026</Text>

                        <Text style={styles.sectionTitle}>1. Data Collection</Text>
                        <Text style={styles.policyText}>
                            We collect minimal data: your name, email, and the commitments you make within the protocol. This data is essential for peer verification and the settlement system.
                        </Text>

                        <Text style={styles.sectionTitle}>2. Use of Data</Text>
                        <Text style={styles.policyText}>
                            Your data is used solely to facilitate the "Pay & Promise" mechanism. We do not sell, rent, or trade your personal information to third parties.
                        </Text>

                        <Text style={styles.sectionTitle}>3. Security</Text>
                        <Text style={styles.policyText}>
                            All transactions and sensitive data are protected by industry-standard encryption and Row Level Security on our servers.
                        </Text>

                        <Text style={styles.sectionTitle}>4. Your Rights</Text>
                        <Text style={styles.policyText}>
                            You have the right to access, rectify, or delete your data at any time. For a full data purge, please use the "Request Data Deletion" tool in Security settings.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
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
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    content: {
        padding: 20,
    },
    policyCard: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 1,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '700',
        marginBottom: 24,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        marginTop: 16,
    },
    policyText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 22,
        fontWeight: '500',
    },
}) as any;
