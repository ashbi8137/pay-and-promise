import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TermsScreen() {
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
                    <Text style={styles.headerTitle}>Terms of Protocol</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.termsCard}>
                        <Text style={styles.lastUpdated}>Version 1.0 • January 2026</Text>

                        <Text style={styles.sectionTitle}>1. Protocol Membership</Text>
                        <Text style={styles.paragraph}>
                            By using Pay & Promise, you enter into a peer-to-peer social contract. You agree that your commitments are visible to your chosen peers for verification purposes.
                        </Text>

                        <Text style={styles.sectionTitle}>2. Verification & Integrity</Text>
                        <Text style={styles.paragraph}>
                            The integrity of the protocol relies on honest peer verification. Any attempts to manipulate or falsify proof of commitment may result in account restriction.
                        </Text>

                        <Text style={styles.sectionTitle}>3. Transaction Settlement</Text>
                        <Text style={styles.paragraph}>
                            Settlements are processed based on peer consensus. Pay & Promise is a facilitation tool; actual monetary transfers occur via external UPI gateways.
                        </Text>

                        <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
                        <Text style={styles.paragraph}>
                            Pay & Promise Protocol is provided "as is". We are not liable for any disputes arising from peer-to-peer commitments or external payment failures.
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
    termsCard: {
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
    paragraph: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 22,
        fontWeight: '500',
    },
}) as any;
