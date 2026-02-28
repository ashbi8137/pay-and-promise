import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

const LEVEL_CONFIG: Record<number, { title: string; color: string; bg: string; icon: string }> = {
    1: { title: 'NEWCOMER', color: '#64748B', bg: '#F1F5F9', icon: 'leaf' },
    2: { title: 'RISING', color: '#10B981', bg: '#ECFDF5', icon: 'trending-up' },
    3: { title: 'COMMITTED', color: '#3B82F6', bg: '#EFF6FF', icon: 'shield-checkmark' },
    4: { title: 'PRO', color: '#8B5CF6', bg: '#F5F3FF', icon: 'diamond' },
    5: { title: 'LEGEND', color: '#F59E0B', bg: '#FFFBEB', icon: 'star' },
};

export default function ProfileScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
    const [firstName, setFirstName] = useState<string>('User');
    const [ppStats, setPpStats] = useState({ balance: 0, lifetime: 0, streak: 0, level: 1 });
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [memberSince, setMemberSince] = useState<string>('');

    useFocusEffect(
        React.useCallback(() => {
            fetchProfileData();
        }, [])
    );

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
            if (metadataName) {
                setFirstName(metadataName.split(' ')[0]);
            } else if (user.email) {
                setFirstName(user.email.split('@')[0]);
            }

            setProfile({ name: metadataName || 'Executive Member', email: user.email || '' });

            // Member since date
            if (user.created_at) {
                const d = new Date(user.created_at);
                setMemberSince(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            }

            // Fetch avatar URL from profiles table
            const { data: profileData } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single();
            if (profileData?.avatar_url) {
                console.log('Profile Loaded - Avatar:', profileData.avatar_url);
                setAvatarUrl(profileData.avatar_url);
            } else {
                console.log('Profile Loaded - No Avatar URL found in DB');
            }

            // Fetch PP stats from profiles table
            const { data: ppData } = await supabase
                .from('profiles')
                .select('promise_points, lifetime_points, current_streak, level')
                .eq('id', user.id)
                .single();

            if (ppData) {
                setPpStats({
                    balance: ppData.promise_points || 0,
                    lifetime: ppData.lifetime_points || 0,
                    streak: ppData.current_streak || 0,
                    level: ppData.level || 1,
                });
            }

            console.log('Profile Loaded - Name:', metadataName || 'Executive Member');
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                showAlert({ title: 'Permission Required', message: 'Please allow access to photos to update your profile picture.', type: 'warning' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setUploadingImage(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                const selectedUri = result.assets[0].uri;
                setAvatarUrl(selectedUri);

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const uri = result.assets[0].uri;
                const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${user.id}/avatar.${fileExt}`;
                const mimeType = result.assets[0].mimeType || `image/${fileExt}`;

                const formData = new FormData();
                formData.append('file', {
                    uri: uri,
                    name: fileName,
                    type: mimeType
                } as any);

                await supabase.storage.from('profile').remove([fileName]);
                const { error: uploadError } = await supabase.storage.from('profile').upload(fileName, formData, {
                    contentType: mimeType,
                    upsert: true
                });

                if (uploadError) {
                    showAlert({ title: 'Upload Failed', message: 'Could not upload image.', type: 'error' });
                    return;
                }

                const { data: urlData } = supabase.storage.from('profile').getPublicUrl(fileName);
                const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl });
                setAvatarUrl(publicUrl);
                showAlert({ title: 'Success', message: 'Profile photo updated!', type: 'success' });
            }
        } catch (error) {
            showAlert({ title: 'Error', message: 'Could not update photo.', type: 'error' });
        } finally {
            setUploadingImage(false);
        }
    };

    const levelConfig = LEVEL_CONFIG[Math.min(ppStats.level, 5)] || LEVEL_CONFIG[1];
    const nextLevelPP = ppStats.level >= 5 ? null : [100, 300, 600, 1000][ppStats.level - 1];
    const levelProgress = nextLevelPP ? Math.min(ppStats.lifetime / nextLevelPP, 1) : 1;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5B2DAD" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                {/* Luxury Header */}
                <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
                    <View style={styles.headerIdentity}>
                        <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} disabled={uploadingImage}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <LinearGradient colors={['#5B2DAD', '#7C3AED']} style={styles.avatarGradient}>
                                    <Text style={styles.avatarTxt}>{firstName.charAt(0).toUpperCase()}</Text>
                                </LinearGradient>
                            )}
                            {uploadingImage ? (
                                <View style={styles.avatarEditBadge}><ActivityIndicator size="small" color="#FFF" /></View>
                            ) : (
                                <View style={styles.avatarEditBadge}><Ionicons name="camera" size={10} color="#FFF" /></View>
                            )}
                        </TouchableOpacity>
                        <View style={styles.nameBlock}>
                            <Text style={styles.userName} numberOfLines={1}>{profile?.name}</Text>
                            <View style={styles.tierBadge}>
                                <View style={[styles.tierDot, { backgroundColor: levelConfig.color }]} />
                                <Text style={[styles.tierTxt, { color: levelConfig.color }]}>{levelConfig.title}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/screens/SettingsScreen')} style={styles.settingsBtn}>
                        <Ionicons name="settings-sharp" size={20} color="#5B2DAD" />
                    </TouchableOpacity>
                </Animated.View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfileData(); }} tintColor="#5B2DAD" />}
                >
                    {/* ═══════════════ PP DASHBOARD CARD ═══════════════ */}
                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.dashboardSection}>
                        <LinearGradient
                            colors={['#5B2DAD', '#7C3AED']}
                            style={styles.ppCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {/* Decorative circles */}
                            <View style={styles.decorCircle1} />
                            <View style={styles.decorCircle2} />

                            <Text style={styles.ppCardLabel}>PROMISE POINTS</Text>
                            <Text style={styles.ppCardValue}>{ppStats.balance}</Text>
                            <Text style={styles.ppCardUnit}>PP Available</Text>

                            <View style={styles.ppCardDivider} />

                            <View style={styles.ppCardStats}>
                                <View style={styles.ppCardStat}>
                                    <Ionicons name="star" size={16} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.ppCardStatValue}>{ppStats.lifetime}</Text>
                                    <Text style={styles.ppCardStatLabel}>Lifetime</Text>
                                </View>
                                <View style={styles.ppCardStatDivider} />
                                <View style={styles.ppCardStat}>
                                    <Ionicons name="flame" size={16} color="#FCA5A5" />
                                    <Text style={styles.ppCardStatValue}>{ppStats.streak}</Text>
                                    <Text style={styles.ppCardStatLabel}>Streak</Text>
                                </View>
                                <View style={styles.ppCardStatDivider} />
                                <View style={styles.ppCardStat}>
                                    <Ionicons name="trophy" size={16} color="#FDE68A" />
                                    <Text style={styles.ppCardStatValue}>Lv.{ppStats.level}</Text>
                                    <Text style={styles.ppCardStatLabel}>Level</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* ═══════════════ LEVEL PROGRESS ═══════════════ */}
                    {/* ═══════════════ REWARDS & COMMUNITY ═══════════════ */}
                    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
                        <Text style={styles.sectionTitle}>REWARDS & COMMUNITY</Text>

                        <TouchableOpacity
                            style={[styles.redeemCard, { marginBottom: scaleFont(12) }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                showAlert({
                                    title: "Hold Tight! 🎁",
                                    message: "Redemption feature coming soon",
                                    type: 'info',
                                    buttons: [{ text: "I'm Ready", onPress: () => null }]
                                });
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={styles.redeemContent}>
                                <View style={styles.redeemIconBg}>
                                    <Ionicons name="gift" size={24} color="#10B981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.redeemTitle}>Redeem Your PP</Text>
                                    <Text style={styles.redeemSubtitle}>Exchange points for exclusive discounts</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#10B981" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.leaderboardCard}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/screens/ScoreboardScreen');
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={styles.redeemContent}>
                                <View style={[styles.redeemIconBg, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="podium-outline" size={24} color="#D97706" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.redeemTitle, { color: '#B45309' }]}>Global Leaderboard</Text>
                                    <Text style={[styles.redeemSubtitle, { color: '#D97706' }]}>See who's staying consistent</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#D97706" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ═══════════════ FOOTER ═══════════════ */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            {memberSince ? `Member since ${memberSince}` : 'Pay & Promise'}
                        </Text>
                        <Text style={styles.footerVersion}>v2.1.0</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(56) : scaleFont(16),
        paddingBottom: scaleFont(16),
    },
    headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(14), flex: 1 },
    avatarWrapper: { position: 'relative' },
    avatarGradient: { width: scaleFont(56), height: scaleFont(56), borderRadius: scaleFont(28), alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: scaleFont(22), fontWeight: '900', color: '#FFF', fontFamily: 'Outfit_800ExtraBold' },
    avatarImage: { width: scaleFont(56), height: scaleFont(56), borderRadius: scaleFont(28) },
    avatarEditBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: scaleFont(22), height: scaleFont(22), borderRadius: scaleFont(11),
        backgroundColor: '#5B2DAD', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#F8FAFC',
    },
    nameBlock: { flex: 1, gap: scaleFont(3) },
    userName: { fontSize: scaleFont(26), fontWeight: '900', color: '#0F172A', letterSpacing: scaleFont(-0.5), fontFamily: 'Outfit_800ExtraBold' },
    tierBadge: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(6) },
    tierDot: { width: scaleFont(6), height: scaleFont(6), borderRadius: scaleFont(3) },
    tierTxt: { fontSize: scaleFont(11), fontWeight: '800', letterSpacing: scaleFont(1.2), fontFamily: 'Outfit_800ExtraBold' },
    settingsBtn: {
        width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(14),
        backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#5B2DAD', shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.08, shadowRadius: scaleFont(12), elevation: scaleFont(3),
    },

    scrollContent: { paddingBottom: scaleFont(120) },

    // ── PP Dashboard Card ──
    dashboardSection: { paddingHorizontal: scaleFont(24), marginBottom: scaleFont(24) },
    ppCard: {
        borderRadius: scaleFont(28), padding: scaleFont(28),
        overflow: 'hidden', position: 'relative',
    },
    decorCircle1: {
        position: 'absolute', top: -scaleFont(30), right: -scaleFont(30),
        width: scaleFont(120), height: scaleFont(120), borderRadius: scaleFont(60),
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    decorCircle2: {
        position: 'absolute', bottom: -scaleFont(20), left: -scaleFont(20),
        width: scaleFont(80), height: scaleFont(80), borderRadius: scaleFont(40),
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    ppCardLabel: {
        fontSize: scaleFont(10), fontWeight: '800', color: 'rgba(255,255,255,0.6)',
        letterSpacing: scaleFont(2), fontFamily: 'Outfit_800ExtraBold',
        textAlign: 'center', marginBottom: scaleFont(4),
    },
    ppCardValue: {
        fontSize: scaleFont(56), fontWeight: '900', color: '#FFFFFF',
        letterSpacing: scaleFont(-3), fontFamily: 'Outfit_800ExtraBold',
        textAlign: 'center',
    },
    ppCardUnit: {
        fontSize: scaleFont(13), fontWeight: '600', color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Outfit_700Bold', textAlign: 'center', marginBottom: scaleFont(20),
    },
    ppCardDivider: {
        height: 1, backgroundColor: 'rgba(255,255,255,0.15)',
        marginBottom: scaleFont(20),
    },
    ppCardStats: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    },
    ppCardStat: { alignItems: 'center', gap: scaleFont(4) },
    ppCardStatValue: {
        fontSize: scaleFont(18), fontWeight: '900', color: '#FFFFFF',
        fontFamily: 'Outfit_800ExtraBold',
    },
    ppCardStatLabel: {
        fontSize: scaleFont(10), fontWeight: '700', color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Outfit_700Bold', letterSpacing: scaleFont(0.5),
    },
    ppCardStatDivider: {
        width: 1, height: scaleFont(30), backgroundColor: 'rgba(255,255,255,0.15)',
    },

    // ── Redeem Section ──
    section: { paddingHorizontal: scaleFont(24), marginBottom: scaleFont(20) },
    sectionTitle: {
        fontSize: scaleFont(10), fontWeight: '900', color: '#94A3B8',
        letterSpacing: scaleFont(2), marginBottom: scaleFont(12),
        fontFamily: 'Outfit_800ExtraBold',
    },
    redeemCard: {
        backgroundColor: '#ECFDF5', // Soft emerald
        borderRadius: scaleFont(24), padding: scaleFont(20),
        borderWidth: 1, borderColor: '#A7F3D0',
        shadowColor: '#10B981', shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.1, shadowRadius: scaleFont(12), elevation: scaleFont(2),
    },
    redeemContent: {
        flexDirection: 'row', alignItems: 'center', gap: scaleFont(14),
    },
    redeemIconBg: {
        width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(14),
        backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
    },
    redeemTitle: {
        fontSize: scaleFont(16), fontWeight: '800', color: '#065F46',
        fontFamily: 'Outfit_800ExtraBold', marginBottom: scaleFont(2),
    },
    redeemSubtitle: {
        fontSize: scaleFont(11), fontWeight: '600', color: '#059669',
        fontFamily: 'Outfit_400Regular',
    },
    leaderboardCard: {
        backgroundColor: '#FFFBEB', // Soft amber
        borderRadius: scaleFont(24), padding: scaleFont(20),
        borderWidth: 1, borderColor: '#FDE68A',
        shadowColor: '#D97706', shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.1, shadowRadius: scaleFont(12), elevation: scaleFont(2),
    },

    // ── Footer ──
    footer: {
        alignItems: 'center', paddingVertical: scaleFont(24), gap: scaleFont(6),
        opacity: 0.4,
    },
    footerDot: {
        width: scaleFont(4), height: scaleFont(4), borderRadius: scaleFont(2),
        backgroundColor: '#94A3B8', marginBottom: scaleFont(4),
    },
    footerText: {
        fontSize: scaleFont(11), fontWeight: '600', color: '#64748B',
        fontFamily: 'Outfit_700Bold',
    },
    footerVersion: {
        fontSize: scaleFont(9), fontWeight: '800', color: '#94A3B8',
        letterSpacing: scaleFont(1.5), fontFamily: 'Outfit_800ExtraBold',
    },
});
