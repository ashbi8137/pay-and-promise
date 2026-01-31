import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SupportScreen() {
    const router = useRouter();

    const handleContact = (subject: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`mailto:payandpromise@gmail.com?subject=${subject}`);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.headerSubtitle}>ASSISTANCE HUB</Text>
                        <Text style={styles.headerTitle}>Help & Support</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>How can we assist you today?</Text>
                        <Text style={styles.heroSubtitle}>Choose a dedicated channel to get in touch with our protocol team.</Text>
                    </View>

                    <View style={styles.optionsGrid}>
                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Support Request')}>
                            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="mail" size={24} color="#4F46E5" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Priority Support</Text>
                                <Text style={styles.optionDesc}>Direct line for account and transaction issues.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Question regarding Pay & Promise')}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="chatbubbles" size={24} color="#16A34A" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Knowledge Base</Text>
                                <Text style={styles.optionDesc}>Browse frequently asked questions and guides.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Bug Report')}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="bug" size={24} color="#EF4444" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Report Protocol Bug</Text>
                                <Text style={styles.optionDesc}>Help us fortify the system by reporting issues.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Feature Request')}>
                            <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="bulb" size={24} color="#F97316" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Suggest Enhancement</Text>
                                <Text style={styles.optionDesc}>Contribute ideas for the next protocol update.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerNoteContainer}>
                        <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.footerNoteCard}>
                            <Ionicons name="time-outline" size={18} color="#4F46E5" />
                            <Text style={styles.footerNoteText}>Standard response time: &lt; 24 Hours</Text>
                        </LinearGradient>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 44 : 12,
        paddingBottom: 20
    },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    headerText: { alignItems: 'center' },
    headerSubtitle: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 2 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 2 },
    content: { padding: 24 },
    hero: { marginBottom: 32 },
    heroTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1, marginBottom: 8 },
    heroSubtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, fontWeight: '500' },
    optionsGrid: { gap: 16 },
    optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    iconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    optionContent: { flex: 1 },
    optionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    optionDesc: { fontSize: 13, color: '#94A3B8', fontWeight: '500', lineHeight: 18 },
    footerNoteContainer: { marginTop: 40, alignItems: 'center' },
    footerNoteCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    footerNoteText: { fontSize: 13, fontWeight: '700', color: '#64748B' }
});
