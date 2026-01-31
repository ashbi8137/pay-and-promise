import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
                    <Text style={styles.headerTitle}>About</Text>
                    <View style={{ width: 44 }} />
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
                            <Ionicons name="mail" size={20} color="#4F46E5" />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Global Support</Text>
                            <Text style={styles.contactValue}>payandpromise@gmail.com</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
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
                        <Ionicons name="shield-checkmark" size={14} color="#94A3B8" />
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
        alignItems: 'center',
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 110,
        height: 110,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    logo: {
        width: 110,
        height: 110,
        borderRadius: 28,
    },
    appName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    version: {
        fontSize: 14,
        color: '#6366F1',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    devCard: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        padding: 24,
        borderRadius: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 1,
    },
    devLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 20,
        textAlign: 'center',
        letterSpacing: 1.5,
    },
    teamMember: {
        alignItems: 'center',
    },
    teamDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 18,
        width: '40%',
        alignSelf: 'center',
    },
    devName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    devRole: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
        marginBottom: 24,
    },
    contactIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contactLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    contactValue: {
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '700',
    },
    legalRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    legalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    legalButtonText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyright: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        marginLeft: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
}) as any;
