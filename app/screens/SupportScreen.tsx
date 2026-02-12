import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { scaleFont } from '../../utils/layout';

export default function SupportScreen() {
    const router = useRouter();

    const handleContact = (subject: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`mailto:payandpromise@gmail.com?subject=${subject}`);
    };

    return (
        <View style={styles.container}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.headerSubtitle}>ASSISTANCE HUB</Text>
                        <Text style={styles.headerTitle}>Help & Support</Text>
                    </View>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>How can we assist you today?</Text>
                        <Text style={styles.heroSubtitle}>Choose a dedicated channel to get in touch with our protocol team.</Text>
                    </View>

                    <View style={styles.optionsGrid}>
                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Support Request')}>
                            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="mail" size={scaleFont(24)} color="#5B2DAD" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Priority Support</Text>
                                <Text style={styles.optionDesc}>Direct line for account and transaction issues.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={scaleFont(18)} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Question regarding Pay & Promise')}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="chatbubbles" size={scaleFont(24)} color="#16A34A" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Knowledge Base</Text>
                                <Text style={styles.optionDesc}>Browse frequently asked questions and guides.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={scaleFont(18)} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Bug Report')}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="bug" size={scaleFont(24)} color="#EF4444" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Report Protocol Bug</Text>
                                <Text style={styles.optionDesc}>Help us fortify the system by reporting issues.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={scaleFont(18)} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionCard} onPress={() => handleContact('Feature Request')}>
                            <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="bulb" size={scaleFont(24)} color="#F97316" />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Suggest Enhancement</Text>
                                <Text style={styles.optionDesc}>Contribute ideas for the next protocol update.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={scaleFont(18)} color="#CBD5E1" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerNoteContainer}>
                        <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.footerNoteCard}>
                            <Ionicons name="time-outline" size={scaleFont(18)} color="#5B2DAD" />
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
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(44) : scaleFont(12),
        paddingBottom: scaleFont(20)
    },
    backButton: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(14), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: scaleFont(2), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(2) }, shadowOpacity: 0.05, shadowRadius: scaleFont(5) },
    headerText: { alignItems: 'center' },
    headerSubtitle: { fontSize: scaleFont(9), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    headerTitle: { fontSize: scaleFont(18), fontWeight: '900', color: '#1E293B', marginTop: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    content: { padding: scaleFont(24) },
    hero: { marginBottom: scaleFont(32) },
    heroTitle: { fontSize: scaleFont(28), fontWeight: '900', color: '#0F172A', letterSpacing: scaleFont(-1), marginBottom: scaleFont(8), fontFamily: 'Outfit_800ExtraBold' },
    heroSubtitle: { fontSize: scaleFont(15), color: '#64748B', lineHeight: scaleFont(22), fontWeight: '500', fontFamily: 'Outfit_400Regular' },
    optionsGrid: { gap: scaleFont(16) },
    optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: scaleFont(24), padding: scaleFont(16), borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(4) }, shadowOpacity: 0.02, shadowRadius: scaleFont(10), elevation: scaleFont(2) },
    iconBox: { width: scaleFont(56), height: scaleFont(56), borderRadius: scaleFont(18), justifyContent: 'center', alignItems: 'center', marginRight: scaleFont(16) },
    optionContent: { flex: 1 },
    optionTitle: { fontSize: scaleFont(16), fontWeight: '800', color: '#1E293B', marginBottom: scaleFont(4), fontFamily: 'Outfit_800ExtraBold' },
    optionDesc: { fontSize: scaleFont(13), color: '#94A3B8', fontWeight: '500', lineHeight: scaleFont(18), fontFamily: 'Outfit_400Regular' },
    footerNoteContainer: { marginTop: scaleFont(40), alignItems: 'center' },
    footerNoteCard: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(10), paddingVertical: scaleFont(12), paddingHorizontal: scaleFont(20), borderRadius: scaleFont(16), borderWidth: 1, borderColor: '#F1F5F9' },
    footerNoteText: { fontSize: scaleFont(13), fontWeight: '700', color: '#64748B', fontFamily: 'Outfit_700Bold' }
});
