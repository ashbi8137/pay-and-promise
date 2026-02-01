import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Image, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { scaleFont } from '../utils/layout';

export default function AboutScreen() {
    const router = useRouter();

    const handleEmail = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL('mailto:payandpromise@gmail.com');
    };

    const handlePress = (path: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(path as any);
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
                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>About</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Branding Section */}
                    <View style={styles.brandSection}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/icon.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.appName}>Pay & Promise</Text>
                        <Text style={styles.version}>v1.0.0 "Genesis"</Text>
                    </View>

                    {/* Team Info */}
                    <View style={styles.devCard}>
                        <Text style={styles.devLabel}>The Architects</Text>

                        <View style={styles.teamMember}>
                            <Text style={styles.devName}>Ashbin Puthusseri</Text>
                            <Text style={styles.devRole}>Founder & Lead Developer</Text>
                        </View>

                        <View style={styles.teamDivider} />

                        <View style={styles.teamMember}>
                            <Text style={styles.devName}>Rahul T U</Text>
                            <Text style={styles.devRole}>Marketing & Growth Lead</Text>
                        </View>

                        <View style={styles.teamDivider} />

                        <View style={styles.teamMember}>
                            <Text style={styles.devName}>Ajay Sreenivasan</Text>
                            <Text style={styles.devRole}>Design & Brand Lead</Text>
                        </View>
                    </View>

                    {/* Contact Section */}
                    <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
                        <View style={styles.contactIconCircle}>
                            <Ionicons name="mail" size={scaleFont(20)} color="#4F46E5" />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Global Support</Text>
                            <Text style={styles.contactValue}>payandpromise@gmail.com</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(20)} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    {/* Legal Row */}
                    <View style={styles.legalRow}>
                        <TouchableOpacity style={styles.legalButton} onPress={() => handlePress('/screens/PrivacyPolicyScreen')}>
                            <Text style={styles.legalButtonText}>Privacy</Text>
                        </TouchableOpacity>
                        <View style={styles.dot} />
                        <TouchableOpacity style={styles.legalButton} onPress={() => handlePress('/screens/TermsScreen')}>
                            <Text style={styles.legalButtonText}>Terms</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Ionicons name="shield-checkmark" size={scaleFont(14)} color="#94A3B8" />
                        <Text style={styles.copyright}>© 2026 Pay & Promise Protocol</Text>
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
        paddingHorizontal: scaleFont(20),
        paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10),
        paddingBottom: scaleFont(20),
    },
    backButton: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(12),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(2) },
        shadowOpacity: 0.05,
        shadowRadius: scaleFont(4),
        elevation: scaleFont(2),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    content: {
        padding: scaleFont(20),
        alignItems: 'center',
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: scaleFont(32),
    },
    logoContainer: {
        width: scaleFont(110),
        height: scaleFont(110),
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(28),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleFont(20),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(10) },
        shadowOpacity: 0.1,
        shadowRadius: scaleFont(20),
        elevation: scaleFont(6),
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    logo: {
        width: scaleFont(110),
        height: scaleFont(110),
        borderRadius: scaleFont(28),
    },
    appName: {
        fontSize: scaleFont(26),
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: scaleFont(-0.5),
        marginBottom: scaleFont(8),
        fontFamily: 'Outfit_800ExtraBold',
    },
    version: {
        fontSize: scaleFont(14),
        color: '#6366F1',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: scaleFont(2),
        fontFamily: 'Outfit_700Bold',
    },
    devCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        padding: scaleFont(24),
        borderRadius: scaleFont(24),
        marginBottom: scaleFont(24),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.04,
        shadowRadius: scaleFont(12),
        elevation: scaleFont(1),
    },
    devLabel: {
        fontSize: scaleFont(11),
        color: '#94A3B8',
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: scaleFont(20),
        textAlign: 'center',
        letterSpacing: scaleFont(1.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    teamMember: {
        alignItems: 'center',
    },
    teamDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: scaleFont(18),
        width: '40%',
        alignSelf: 'center',
    },
    devName: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: scaleFont(4),
        fontFamily: 'Outfit_700Bold',
    },
    devRole: {
        fontSize: scaleFont(13),
        color: '#64748B',
        fontWeight: '500',
        fontFamily: 'Outfit_400Regular',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: scaleFont(18),
        borderRadius: scaleFont(20),
        width: '100%',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.03,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(1),
        marginBottom: scaleFont(24),
    },
    contactIconCircle: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(12),
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaleFont(16),
    },
    contactLabel: {
        fontSize: scaleFont(11),
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: scaleFont(4),
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_700Bold',
    },
    contactValue: {
        fontSize: scaleFont(15),
        color: '#1E293B',
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleFont(40),
    },
    legalButton: {
        paddingVertical: scaleFont(8),
        paddingHorizontal: scaleFont(16),
    },
    legalButtonText: {
        fontSize: scaleFont(13),
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_700Bold',
    },
    dot: {
        width: scaleFont(4),
        height: scaleFont(4),
        borderRadius: scaleFont(2),
        backgroundColor: '#CBD5E1',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyright: {
        fontSize: scaleFont(11),
        color: '#94A3B8',
        fontWeight: '600',
        marginLeft: scaleFont(6),
        textTransform: 'uppercase',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_700Bold',
    },
});
