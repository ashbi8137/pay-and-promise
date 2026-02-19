import { Ionicons } from '@expo/vector-icons';
import * as ExpoClipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
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
    View,
    useColorScheme
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { Colors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { getLocalTodayDate } from '../../utils/dateUtils';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

export default function PromiseDetailScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Parse the promise data from params
    const promiseData = params.promise ? JSON.parse(params.promise as string) : null;

    if (!promiseData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Promise details not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButtonAlt}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { title, duration, numPeople, commitment_level, locked_points, invite_code } = promiseData;
    const commitmentLevel = commitment_level || promiseData.commitmentLevel || 'medium';
    const lockedPoints = locked_points || promiseData.lockedPoints || 10;

    const [updating, setUpdating] = React.useState(false);
    const [checkins, setCheckins] = React.useState<{ date: string, status: string }[]>([]);
    const [todayStatus, setTodayStatus] = React.useState<'done' | 'failed' | null>(null);
    const [realParticipantCount, setRealParticipantCount] = React.useState(numPeople);
    const [currentPromiseStatus, setCurrentPromiseStatus] = React.useState(promiseData.status);
    const [actualStartDate, setActualStartDate] = React.useState<string | null>(null);

    const [submissions, setSubmissions] = React.useState<any[]>([]);
    const [myVotes, setMyVotes] = React.useState<string[]>([]);
    const [userId, setUserId] = React.useState<string | null>(null);
    const [userNames, setUserNames] = React.useState<Record<string, string>>({});
    const [joinedParticipants, setJoinedParticipants] = React.useState<any[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchInitialData();

        const subChannel = supabase.channel(`promise_detail_v2_${promiseData.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'promise_submissions', filter: `promise_id=eq.${promiseData.id}` },
                () => {
                    fetchDailyReview();
                    fetchCheckins();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'submission_verifications' },
                () => {
                    fetchDailyReview();
                    fetchCheckins();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'promise_participants', filter: `promise_id=eq.${promiseData.id}` },
                () => {
                    fetchParticipantCount();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'promises', filter: `id=eq.${promiseData.id}` },
                (payload) => {
                    setCurrentPromiseStatus(payload.new.status);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subChannel);
        };
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchCheckins(),
                fetchParticipantCount(),
                fetchDailyReview(),
                fetchLatestPromiseStatus()
            ]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchCheckins(),
            fetchParticipantCount(),
            fetchDailyReview(),
            fetchLatestPromiseStatus()
        ]);
        setRefreshing(false);
    }, []);

    const handleCopyCode = async () => {
        if (!invite_code) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await ExpoClipboard.setStringAsync(invite_code);
        showAlert({
            title: "Copied!",
            message: "Invite code copied to clipboard.",
            type: "success"
        });
    };

    const fetchDailyReview = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const todayStr = getLocalTodayDate();

        const { data: subs } = await supabase
            .from('promise_submissions')
            .select('*')
            .eq('promise_id', promiseData.id)
            .eq('date', todayStr);

        if (subs) {
            setSubmissions(subs);
            const userIds = subs.map(s => s.user_id);
            if (userIds.length > 0) {
                const { data: names } = await supabase.rpc('get_user_names', { user_ids: userIds });
                if (names) {
                    const nameMap: Record<string, string> = {};
                    names.forEach((n: any) => { nameMap[n.user_id] = n.full_name; });
                    setUserNames(nameMap);
                }
            }

            const subIds = subs.map(s => s.id);
            const { data: votes } = await supabase
                .from('submission_verifications')
                .select('submission_id')
                .in('submission_id', subIds)
                .eq('verifier_user_id', user.id);

            if (votes) setMyVotes(votes.map(v => v.submission_id));
        }
    };

    const handleVote = async (submissionId: string, decision: 'confirm' | 'reject') => {
        if (!userId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setUpdating(true);
        try {
            const { error } = await supabase.from('submission_verifications').insert({
                submission_id: submissionId,
                verifier_user_id: userId,
                decision: decision
            });
            if (error) throw error;

            setMyVotes(prev => [...prev, submissionId]);
            const dateStr = getLocalTodayDate();
            await supabase.rpc('check_and_finalize_verification', {
                p_promise_id: promiseData.id,
                p_date: dateStr
            });

        } catch (e) {
            console.error(e);
            showAlert({ title: "Error", message: "Could not record vote.", type: "error" });
        } finally {
            setUpdating(false);
        }
    };

    const fetchParticipantCount = async () => {
        // DEBUG: Explicitly show we are trying to fetch
        // console.log('[MeetingRoom] Fetching for:', promiseData.id);

        try {
            const { data, error } = await supabase
                .from('promise_participants')
                .select('user_id, created_at')
                .eq('promise_id', promiseData.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.log('[MeetingRoom] RLS blocked access, fetching fresh cache.');

                // Fetch fresh promise data to get latest cache
                const { data: freshPromise } = await supabase
                    .from('promises')
                    .select('participants')
                    .eq('id', promiseData.id)
                    .single();

                const fallbackList = freshPromise?.participants || promiseData.participants;

                if (fallbackList) {
                    const mapped = fallbackList.map((p: any) => ({
                        name: p.name || 'User',
                        id: 'unknown',
                        avatar_url: p.avatar_url || null
                    }));
                    setJoinedParticipants(mapped);
                    setRealParticipantCount(mapped.length);
                }
                return;
            }

            if (data) {
                setRealParticipantCount(data.length);
                const userIds = data.map(d => d.user_id);

                if (userIds.length > 0) {
                    // 1. Fetch Names via RPC
                    const { data: names, error: rpcError } = await supabase.rpc('get_user_names', { user_ids: userIds });

                    if (rpcError) {
                        console.error('[MeetingRoom] RPC Error:', rpcError);
                    }

                    // 2. Try Fetching Profiles for Avatars
                    let avatarMap: Record<string, string> = {};
                    try {
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, avatar_url')
                            .in('id', userIds);

                        if (profiles) {
                            profiles.forEach((p: any) => {
                                if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
                            });
                        }
                    } catch (e) {
                        console.log('[MeetingRoom] Avatar fetch skipped', e);
                    }

                    if (names) {
                        const formatted = names.map((n: any) => ({
                            name: n.full_name?.split(' ')[0] || n.email?.split('@')[0] || "User",
                            id: n.user_id,
                            avatar_url: avatarMap[n.user_id] || null
                        }));

                        // CRITICAL FIX: Merge with cache if RLS hides people
                        if (promiseData.participants && promiseData.participants.length > formatted.length) {
                            console.log('[MeetingRoom] Using Cache for Display (RLS Gap detected)');
                            const cached = promiseData.participants.map((p: any) => ({
                                name: p.name || 'User',
                                id: p.id || 'unknown',
                                avatar_url: p.avatar_url || null
                            }));
                            setJoinedParticipants(cached);
                        } else {
                            setJoinedParticipants(formatted);
                        }
                    }
                } else {
                    // RLS returned empty? Use cache
                    if (promiseData.participants && promiseData.participants.length > 0) {
                        console.log('[MeetingRoom] Data Empty, Using Cache');
                        const cached = promiseData.participants.map((p: any) => ({
                            name: p.name || 'User',
                            id: p.id || 'unknown',
                            avatar_url: p.avatar_url || null
                        }));
                        setJoinedParticipants(cached);
                    } else {
                        setJoinedParticipants([]);
                    }
                }

                // Logic: Start Date
                if (data.length >= numPeople) {
                    const lastJoin = data[data.length - 1];
                    setActualStartDate(lastJoin.created_at);
                } else {
                    setActualStartDate(null);
                }
            }
        } catch (err) {
            console.error('[MeetingRoom] Unexpected:', err);
            // Last resort fallback
            if (promiseData.participants) {
                setJoinedParticipants(promiseData.participants.map((p: any) => ({
                    name: p.name,
                    id: 'x',
                    avatar_url: null
                })));
            }
        }
    };

    const fetchLatestPromiseStatus = async () => {
        const { data } = await supabase
            .from('promises')
            .select('status')
            .eq('id', promiseData.id)
            .single();
        if (data) setCurrentPromiseStatus(data.status);
    };

    const fetchCheckins = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('promise_submissions')
                .select('date, status')
                .eq('promise_id', promiseData.id)
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (data) {
                const mappedCheckins = data.map(item => ({
                    date: item.date,
                    status: item.status === 'verified' ? 'done' :
                        (item.status === 'rejected' ? 'failed' : 'pending')
                }));
                setCheckins(mappedCheckins);

                const completedCount = mappedCheckins.filter(c => c.status === 'done' || c.status === 'failed').length;
                // REMOVED: Status updates must be handled by backend settlement to ensure multi-user synchronization
                // if (completedCount >= duration) {
                //     await supabase.from('promises').update({ status: 'completed' }).eq('id', promiseData.id).eq('status', 'active');
                // }

                const todayStr = getLocalTodayDate();
                const todayEntry = mappedCheckins.find(c => c.date === todayStr);
                if (todayEntry) {
                    if (todayEntry.status === 'done' || todayEntry.status === 'failed') {
                        setTodayStatus(todayEntry.status);
                    } else {
                        setTodayStatus(null);
                    }
                } else {
                    setTodayStatus(null);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handlePhotoCheckIn = async () => {
        if (realParticipantCount < numPeople) {
            showAlert({ title: "Wait for others", message: "All peers must join first.", type: "warning" });
            return;
        }

        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            showAlert({ title: "Camera Required", message: "Allow camera access to prove your work.", type: "error" });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: false, // Direct upload, no cropping
            quality: 0.5,
        });

        if (!result.canceled) {
            setUpdating(true); // LOCK UI

            try {
                // Haptic Immediately
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const photo = result.assets[0];
                const ext = photo.uri.substring(photo.uri.lastIndexOf('.') + 1);
                // timestamp filename to uniquely identify this attempt
                const fileName = `${user.id}/${new Date().getTime()}.${ext}`;
                const formData = new FormData();

                formData.append('file', {
                    uri: photo.uri,
                    name: fileName,
                    type: photo.mimeType || `image/${ext}`
                } as any);

                // 1. UPLOAD
                const { error: uploadError } = await supabase.storage.from('proofs').upload(fileName, formData, {
                    contentType: photo.mimeType || `image/${ext}`,
                    upsert: false
                });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(fileName);
                console.log('[Debug] New Image URL:', publicUrl);
                const dateStr = getLocalTodayDate();

                // 2. CHECK / UPSERT SUBMISSION
                // We want to handle "pending" submissions too - allowing REPLACEMENT
                const { data: existing } = await supabase.from('promise_submissions')
                    .select('id, status')
                    .eq('promise_id', promiseData.id)
                    .eq('user_id', user.id)
                    .eq('date', dateStr)
                    .single();

                if (existing) {
                    // RETRY/REPLACE FLOW
                    // Update the image and reset status to 'pending' to restart verification
                    const { error } = await supabase.from('promise_submissions').update({
                        image_url: publicUrl,
                        status: 'pending'
                    }).eq('id', existing.id);
                    if (error) throw error;

                    // CRITICAL: Clear existing verifications so voting restarts
                    await supabase.from('submission_verifications').delete().eq('submission_id', existing.id);

                    // OPTIMISTIC UPDATE: Update local state immediately
                    // Appending time param to ENSURE Image component sees it as unique for sure
                    const robustUrl = `${publicUrl}?t=${new Date().getTime()}`;
                    console.log('[Debug] Optimistic Update. Target User:', user.id);

                    setSubmissions(prev => {
                        const updated = prev.map(s => {
                            if (s.user_id === user.id) {
                                console.log('[Debug] Found match, updating image to:', robustUrl);
                                return { ...s, image_url: robustUrl, status: 'pending' };
                            }
                            return s;
                        });
                        return updated;
                    });

                } else {
                    // NEW FLOW
                    const { error } = await supabase.from('promise_submissions').insert({
                        promise_id: promiseData.id,
                        user_id: user.id,
                        date: dateStr,
                        image_url: publicUrl,
                        status: 'pending'
                    });
                    if (error) throw error;

                    // For new insert, we DO need to fetch to get the ID, but let's wait a bit longer
                    setTimeout(fetchDailyReview, 1000);
                }

                showAlert({ title: "Submitted!", message: "Proof uploaded for verification.", type: "success" });

                // PP distribution is handled by the backend check_and_finalize_verification RPC

                // Refresh checks
                fetchCheckins();

                // RESTORED: Fetch latest after a delay to ensure server consistency
                if (existing) {
                    setTimeout(fetchDailyReview, 1500);
                }
            } catch (e) {
                console.error('Upload error:', e);
                showAlert({ title: "Upload Failed", message: "Could not upload. Please check your network and try again.", type: "error" });
            } finally {
                setUpdating(false);
            }
        }
    };

    const handleCheckIn = async (status: 'done' | 'failed') => {
        if (updating) return;

        if (realParticipantCount < numPeople) {
            showAlert({ title: "Wait for others", message: "All peers must join first.", type: "warning" });
            return;
        }

        if (status === 'done') {
            handlePhotoCheckIn();
            return;
        }

        showAlert({
            title: 'Mark as Failed?',
            message: `You will lose Promise Points for this day.`,
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Failure',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setUpdating(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            const dateStr = getLocalTodayDate();

                            // Insert daily_checkin (ignore conflict if already exists)
                            const { error: checkinError } = await supabase.from('daily_checkins').insert({
                                promise_id: promiseData.id,
                                user_id: user.id,
                                date: dateStr,
                                status: status
                            });
                            if (checkinError && checkinError.code !== '23505') throw checkinError;

                            // ALWAYS ensure submission exists (upsert) — even if checkin had a conflict
                            // This prevents the day from getting stuck when both users mark as failed
                            const { error: subError } = await supabase.from('promise_submissions').upsert({
                                promise_id: promiseData.id,
                                user_id: user.id,
                                date: dateStr,
                                image_url: 'manual_fail',
                                status: 'rejected'
                            }, { onConflict: 'promise_id,user_id,date' });
                            if (subError) throw subError;

                            await supabase.rpc('check_and_finalize_verification', { p_promise_id: promiseData.id, p_date: dateStr });

                            // PP distribution is handled by the backend RPC

                            setTodayStatus(status);
                        } catch (e) {
                            console.error(e);
                            showAlert({ title: 'Error', message: 'Could not mark as failed.', type: 'error' });
                        } finally {
                            setUpdating(false);
                        }
                    }
                }
            ]
        });
    };

    const renderHero = () => {
        const isCompleted = currentPromiseStatus === 'completed' || currentPromiseStatus === 'failed';
        const statusLabel = currentPromiseStatus === 'completed' ? 'SUCCESS' : (currentPromiseStatus === 'failed' ? 'FAILED' : 'ACTIVE');

        return (
            <Animated.View entering={FadeInUp} style={styles.heroCard}>
                <LinearGradient
                    colors={['#5B2DAD', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroOverlay}>
                    <Ionicons name="shield-checkmark" size={140} color="rgba(255,255,255,0.08)" style={styles.bgIcon} />
                    <View style={styles.heroContent}>
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <View style={[styles.statusIndicator, { backgroundColor: '#FFF' }]} />
                            <Text style={styles.statusLabel}>{statusLabel}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{title}</Text>
                        <View style={styles.heroStats}>
                            <View style={styles.heroStatItem}>
                                <Ionicons name="calendar-outline" size={14} color="#FFF" opacity={0.7} />
                                <Text style={styles.heroStatText}>{duration} Days</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.heroBottom}>
                        <View style={styles.stakePill}>
                            <Text style={styles.stakeLabel}>COMMITMENT</Text>
                            <Text style={styles.stakeValue}>{commitmentLevel.charAt(0).toUpperCase() + commitmentLevel.slice(1)}</Text>
                        </View>
                        {invite_code && (
                            <TouchableOpacity style={styles.stakePill} onPress={handleCopyCode}>
                                <Text style={[styles.stakeLabel, { textAlign: 'right' }]}>INVITE CODE</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.stakeValue}>{invite_code}</Text>
                                    <Ionicons name="copy-outline" size={14} color="#FFF" opacity={0.8} />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>
        );
    };

    const renderJourneyMap = () => {
        const totalDuration = duration || 7;
        const days = [];

        // Start Date Logic - Fallback to created_at if actualStartDate not set 
        const startRaw = actualStartDate ? new Date(actualStartDate) : (promiseData.created_at ? new Date(promiseData.created_at) : new Date());

        // Normalize to Local Midnight logic (Same as dateUtils)
        const startLocal = new Date(startRaw.getFullYear(), startRaw.getMonth(), startRaw.getDate());

        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);
        const todayStr = getLocalTodayDate();

        for (let i = 0; i < totalDuration; i++) {
            const d = new Date(startLocal);
            d.setDate(startLocal.getDate() + i);

            // Format manually to match getLocalTodayDate (YYYY-MM-DD)
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${dayStr}`;

            const checkin = checkins.find(c => c.date === dateStr);

            let status = 'pending';
            if (checkin) status = checkin.status;

            // RED DAY LOGIC:
            // If this date is strictly before today (in the past) AND status is still 'pending',
            // it means we missed it. Mark clearly as 'failed'.
            if (d < todayLocal && status === 'pending') {
                status = 'failed';
            }

            days.push({
                dayNum: i + 1,
                status,
                isToday: dateStr === todayStr,
                dateLabel: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
            });
        }

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Journey Progress</Text>
                    <Text style={styles.sectionSub}>Day by Day Breakdown</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineContainer}>
                    {days.map((day, index) => (
                        <Animated.View key={index} entering={FadeInRight.delay(index * 50)} style={styles.timelineItem}>
                            <View style={[
                                styles.dayCircle,
                                day.status === 'done' && styles.dayDone,
                                day.status === 'failed' && styles.dayFailed,
                                day.isToday && styles.dayToday
                            ]}>
                                {day.status === 'done' ? (
                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                ) : day.status === 'failed' ? (
                                    <Ionicons name="close" size={16} color="#FFF" />
                                ) : (
                                    <Text style={[styles.dayNum, day.isToday && { color: '#5B2DAD' }]}>{day.dayNum}</Text>
                                )}
                            </View>
                            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelActive]}>{day.dateLabel}</Text>
                        </Animated.View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderDailyActions = () => {
        const mySub = submissions.find(s => s.user_id === userId);
        const othersSubmissions = submissions.filter(s => s.user_id !== userId);

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Daily Verification</Text>
                </View>

                {/* MY TASK */}
                {mySub ? (
                    <Animated.View entering={FadeInDown} style={styles.actionCard}>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardLabel}>Your Proof</Text>
                            <View style={[styles.statusPill, mySub.status === 'verified' ? styles.pillSuccess : (mySub.status === 'rejected' ? styles.pillError : styles.pillPending)]}>
                                <Text style={styles.pillText}>{mySub.status.toUpperCase()}</Text>
                            </View>
                        </View>
                        {mySub.image_url === 'manual_fail' ? (
                            <View style={styles.failPlaceholder}>
                                <Ionicons name="alert-circle" size={40} color="#EF4444" opacity={0.5} />
                                <Text style={styles.failText}>Marked as Failed</Text>
                            </View>
                        ) : (
                            <View>
                                <Image
                                    key={mySub.image_url}
                                    source={{ uri: mySub.image_url }}
                                    style={styles.submissionImage}
                                />

                                {mySub.status === 'rejected' && (
                                    <View style={{ marginTop: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12 }}>
                                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: scaleFont(13), flex: 1 }}>
                                                Submission Rejected.
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.mainActionBtn} onPress={handlePhotoCheckIn}>
                                            <Ionicons name="refresh" size={20} color="#FFF" />
                                            <Text style={styles.mainActionText}>Retry Submission</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {mySub.status === 'pending' && (
                                    <View style={{ marginTop: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#FEF9C3', padding: 12, borderRadius: 12 }}>
                                            <ActivityIndicator size="small" color="#CA8A04" />
                                            <Text style={{ color: '#CA8A04', fontWeight: '700', fontSize: scaleFont(13), flex: 1 }}>
                                                Waiting for peers...
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#5B2DAD' }]} onPress={handlePhotoCheckIn} disabled={updating}>
                                            <Ionicons name="camera-reverse" size={20} color="#5B2DAD" />
                                            <Text style={[styles.mainActionText, { color: '#5B2DAD' }]}>Change Proof</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </Animated.View>
                ) : (
                    todayStatus !== 'failed' ? (
                        <Animated.View entering={FadeInDown} style={styles.uploadCard}>
                            <Text style={styles.uploadTitle}>Ready for today?</Text>
                            <Text style={styles.uploadSub}>Capture your progress and share it.</Text>
                            <TouchableOpacity style={styles.mainActionBtn} onPress={handlePhotoCheckIn} disabled={updating}>
                                {updating ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#FFF" />
                                        <Text style={styles.mainActionText}>Uploading...</Text>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="camera" size={24} color="#FFF" />
                                        <Text style={styles.mainActionText}>Submit Proof</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleCheckIn('failed')}>
                                <Text style={styles.failLink}>I missed it today</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ) : (
                        <View style={styles.actionCard}>
                            <View style={styles.failPlaceholder}>
                                <Ionicons name="close-circle" size={40} color="#EF4444" opacity={0.5} />
                                <Text style={styles.failText}>Failed for Today</Text>
                            </View>
                        </View>
                    )
                )}

                {/* OTHERS TASK */}
                {othersSubmissions.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                        <Text style={styles.subSectionTitle}>Peer Review Requests</Text>
                        {othersSubmissions.map((sub, idx) => {
                            const isVoted = myVotes.includes(sub.id);
                            const name = userNames[sub.user_id] || "Participant";
                            const isAutoFail = sub.image_url === 'manual_fail';

                            return (
                                <Animated.View key={sub.id} entering={FadeInDown.delay(idx * 100)} style={styles.peerCard}>
                                    <View style={styles.peerHeader}>
                                        <View style={styles.peerAvatar}>
                                            <Text style={styles.avatarChar}>{name[0]}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.peerName}>{name}</Text>
                                            <Text style={styles.peerStatus}>{sub.status === 'verified' ? 'Verified' : (sub.status === 'rejected' ? 'Rejected' : 'Awaiting Review')}</Text>
                                        </View>
                                    </View>

                                    {isAutoFail ? (
                                        <View style={styles.peerFailBox}>
                                            <Ionicons name="warning" size={20} color="#EF4444" />
                                            <Text style={styles.peerFailText}>User admitted failure</Text>
                                        </View>
                                    ) : (
                                        <>
                                            <Image source={{ uri: sub.image_url }} style={styles.peerImage} />
                                            {!isVoted && sub.status === 'pending' && (
                                                <View style={styles.voteBar}>
                                                    <TouchableOpacity
                                                        style={[styles.voteBtn, styles.btnReject]}
                                                        onPress={() => handleVote(sub.id, 'reject')}
                                                    >
                                                        <Ionicons name="close" size={20} color="#EF4444" />
                                                        <Text style={styles.btnRejectText}>Reject</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.voteBtn, styles.btnConfirm]}
                                                        onPress={() => handleVote(sub.id, 'confirm')}
                                                    >
                                                        <Ionicons name="checkmark" size={20} color="#FFF" />
                                                        <Text style={styles.btnConfirmText}>Verify</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                            {isVoted && <Text style={styles.votedFeedback}>Voted</Text>}
                                        </>
                                    )}
                                </Animated.View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const renderCompletion = () => {
        if (currentPromiseStatus !== 'completed' && currentPromiseStatus !== 'failed') return null;
        const isSuccess = currentPromiseStatus === 'completed';

        return (
            <Animated.View entering={FadeInUp} style={[styles.completionCard, isSuccess ? styles.compSuccess : styles.compFailed]}>
                <View style={styles.compIcon}>
                    <Ionicons name={isSuccess ? "trophy" : "alert-circle"} size={32} color={isSuccess ? "#10B981" : "#EF4444"} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.compTitle}>{isSuccess ? "Goal Achieved!" : "Promise Ended"}</Text>
                    <Text style={styles.compSub}>{isSuccess ? "You've proven your commitment." : "View the report to see your results."}</Text>
                </View>
                <TouchableOpacity
                    style={styles.settleBtn}
                    onPress={() => router.push({ pathname: '/screens/PromiseReportScreen', params: { promiseId: promiseData.id } })}
                >
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B2DAD" />
                    <Text style={styles.loadingText}>Syncing Promise...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <GridOverlay />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleMain}>Promise Detail</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B2DAD" />}
                >
                    {renderHero()}

                    {/* MEETING ROOM */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Participants</Text>
                            <Text style={styles.sectionSub}>Member Status ({joinedParticipants.length}/{numPeople})</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: scaleFont(12), paddingHorizontal: scaleFont(4) }}>
                            {joinedParticipants.map((p, i) => (
                                <Animated.View key={`participant-${i}`} entering={FadeInRight.delay(i * 100)} style={{ alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: scaleFont(52), height: scaleFont(52), borderRadius: scaleFont(26), backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DBEAFE', overflow: 'hidden' }}>
                                        {p.avatar_url ? (
                                            <Image source={{ uri: p.avatar_url }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <Text style={{ fontSize: scaleFont(18), fontWeight: '800', color: '#3B82F6' }}>{p.name.charAt(0).toUpperCase()}</Text>
                                        )}
                                    </View>
                                    <Text style={{ fontSize: scaleFont(11), color: '#475569', fontWeight: '600' }}>{p.name}</Text>
                                </Animated.View>
                            ))}
                            {/* Placeholders */}
                            {Array.from({ length: Math.max(0, numPeople - joinedParticipants.length) }).map((_, i) => (
                                <View key={`empty-${i}`} style={{ alignItems: 'center', gap: 6, opacity: 0.5 }}>
                                    <View style={{ width: scaleFont(52), height: scaleFont(52), borderRadius: scaleFont(26), backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                                        <Ionicons name="person-add" size={20} color="#94A3B8" />
                                    </View>
                                    <Text style={{ fontSize: scaleFont(11), color: '#94A3B8' }}>Waiting</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* WAITING FOR TEAM BLOCKER */}
                    {realParticipantCount < numPeople && (
                        <Animated.View entering={FadeInUp} style={styles.waitCard}>
                            <View style={styles.waitIconBox}>
                                <Ionicons name="time" size={32} color="#D97706" />
                            </View>
                            <Text style={styles.waitTitle}>Waiting for Squad...</Text>
                            <Text style={styles.waitSub}>
                                The journey begins automatically when all {numPeople} members have joined.
                            </Text>
                            <View style={styles.waitCodeBox}>
                                <Text style={styles.waitCode}>{invite_code}</Text>
                                <TouchableOpacity onPress={handleCopyCode}>
                                    <Ionicons name="copy-outline" size={20} color="#5B2DAD" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* Show Journey Loop ONLY if Full Team OR if Promise is somehow already active/completed */}
                    {(realParticipantCount >= numPeople || currentPromiseStatus !== 'active') && (
                        <>
                            {renderCompletion()}
                            {renderJourneyMap()}
                            {currentPromiseStatus === 'active' && renderDailyActions()}
                        </>
                    )}

                    <View style={{ height: scaleFont(40) }} />
                </ScrollView>
            </SafeAreaView>
        </View>
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
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(48) : scaleFont(16),
        paddingBottom: scaleFont(16),
    },
    backButton: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(12),
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleMain: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    scrollContent: {
        paddingHorizontal: scaleFont(20),
        paddingBottom: scaleFont(100),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: scaleFont(12),
    },
    loadingText: {
        fontSize: scaleFont(14),
        color: '#64748B',
        fontWeight: '600',
        fontFamily: 'Outfit_700Bold',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: scaleFont(40),
    },
    errorText: {
        fontSize: scaleFont(16),
        color: '#64748B',
        marginBottom: scaleFont(24),
        textAlign: 'center',
        fontFamily: 'Outfit_400Regular',
    },
    backButtonAlt: {
        backgroundColor: '#5B2DAD',
        paddingHorizontal: scaleFont(24),
        paddingVertical: scaleFont(14),
        borderRadius: scaleFont(16),
    },
    backButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    // HERO
    heroCard: {
        height: scaleFont(220),
        borderRadius: scaleFont(28),
        overflow: 'hidden',
        marginBottom: scaleFont(20),
        elevation: scaleFont(8),
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: scaleFont(10) },
        shadowOpacity: 0.2,
        shadowRadius: scaleFont(15),
    },
    heroOverlay: {
        flex: 1,
        padding: scaleFont(24),
        justifyContent: 'space-between',
    },
    bgIcon: {
        position: 'absolute',
        top: scaleFont(-30),
        right: scaleFont(-30),
    },
    heroContent: {
        gap: scaleFont(8),
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: scaleFont(12),
        paddingVertical: scaleFont(6),
        borderRadius: scaleFont(20),
        gap: scaleFont(6),
    },
    statusIndicator: {
        width: scaleFont(6),
        height: scaleFont(6),
        borderRadius: scaleFont(3),
    },
    statusLabel: {
        fontSize: scaleFont(10),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_800ExtraBold',
    },
    heroTitle: {
        fontSize: scaleFont(28),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    heroStats: {
        flexDirection: 'row',
        gap: scaleFont(16),
    },
    heroStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(4),
    },
    heroStatText: {
        fontSize: scaleFont(12),
        color: '#FFF',
        fontWeight: '600',
        opacity: 0.9,
        fontFamily: 'Outfit_700Bold',
    },
    heroBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stakePill: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(8),
        borderRadius: scaleFont(14),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    stakeLabel: {
        fontSize: scaleFont(10),
        color: '#FFF',
        opacity: 0.7,
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    stakeValue: {
        fontSize: scaleFont(18),
        color: '#FFF',
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    // SECTION
    section: {
        marginBottom: scaleFont(32),
    },
    sectionHeader: {
        marginBottom: scaleFont(16),
    },
    sectionTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    sectionSub: {
        fontSize: scaleFont(12),
        color: '#64748B',
        marginTop: scaleFont(2),
        fontFamily: 'Outfit_400Regular',
    },
    subSectionTitle: {
        fontSize: scaleFont(14),
        fontWeight: '700',
        color: '#64748B',
        marginBottom: scaleFont(12),
        textTransform: 'uppercase',
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_700Bold',
    },
    // TIMELINE
    timelineContainer: {
        paddingVertical: scaleFont(10),
        gap: scaleFont(16),
    },
    timelineItem: {
        alignItems: 'center',
        gap: scaleFont(8),
    },
    dayCircle: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(22),
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dayDone: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    dayFailed: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    dayToday: {
        borderColor: '#5B2DAD',
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.2,
        shadowRadius: scaleFont(8),
        elevation: scaleFont(4),
    },
    dayNum: {
        fontSize: scaleFont(14),
        fontWeight: '800',
        color: '#94A3B8',
        fontFamily: 'Outfit_800ExtraBold',
    },
    dayLabel: {
        fontSize: scaleFont(10),
        fontWeight: '700',
        color: '#94A3B8',
        fontFamily: 'Outfit_700Bold',
    },
    dayLabelActive: {
        color: '#5B2DAD',
    },
    // ACTIONS
    actionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(24),
        padding: scaleFont(20),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.04,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(2),
    },
    cardInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scaleFont(16),
    },
    cardLabel: {
        fontSize: scaleFont(15),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    statusPill: {
        paddingHorizontal: scaleFont(10),
        paddingVertical: scaleFont(4),
        borderRadius: scaleFont(8),
    },
    pillPending: { backgroundColor: '#FEF3C7' },
    pillSuccess: { backgroundColor: '#D1FAE5' },
    pillError: { backgroundColor: '#FEE2E2' },
    pillText: {
        fontSize: scaleFont(10),
        fontWeight: '900',
        fontFamily: 'Outfit_800ExtraBold',
    },
    submissionImage: {
        width: '100%',
        height: scaleFont(200),
        borderRadius: scaleFont(16),
        backgroundColor: '#F1F5F9',
    },
    failPlaceholder: {
        width: '100%',
        height: scaleFont(150),
        borderRadius: scaleFont(16),
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scaleFont(8),
    },
    failText: {
        fontSize: scaleFont(14),
        fontWeight: '800',
        color: '#EF4444',
        fontFamily: 'Outfit_800ExtraBold',
    },
    waitingText: {
        fontSize: scaleFont(12),
        color: '#64748B',
        marginTop: scaleFont(12),
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: 'Outfit_400Regular',
    },
    uploadCard: {
        alignItems: 'center',
        padding: scaleFont(32),
        backgroundColor: '#F8FAFC',
        borderRadius: scaleFont(24),
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#CBD5E1',
    },
    uploadTitle: {
        fontSize: scaleFont(20),
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: scaleFont(4),
        fontFamily: 'Outfit_800ExtraBold',
    },
    uploadSub: {
        fontSize: scaleFont(14),
        color: '#64748B',
        marginBottom: scaleFont(24),
        fontFamily: 'Outfit_400Regular',
    },
    mainActionBtn: {
        flexDirection: 'row',
        backgroundColor: '#5B2DAD',
        paddingHorizontal: scaleFont(28),
        paddingVertical: scaleFont(16),
        borderRadius: scaleFont(18),
        alignItems: 'center',
        gap: scaleFont(10),
        elevation: scaleFont(6),
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: scaleFont(6) },
        shadowOpacity: 0.3,
        shadowRadius: scaleFont(12),
    },
    mainActionText: {
        color: '#FFF',
        fontSize: scaleFont(16),
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    failLink: {
        fontSize: scaleFont(13),
        color: '#64748B',
        marginTop: scaleFont(20),
        fontWeight: '600',
        textDecorationLine: 'underline',
        fontFamily: 'Outfit_700Bold',
    },
    // PEER CARD
    peerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(20),
        padding: scaleFont(16),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: scaleFont(16),
    },
    peerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(12),
        marginBottom: scaleFont(16),
    },
    peerAvatar: {
        width: scaleFont(40),
        height: scaleFont(40),
        borderRadius: scaleFont(12),
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    avatarChar: {
        fontSize: scaleFont(16),
        fontWeight: '800',
        color: '#5B2DAD',
        fontFamily: 'Outfit_800ExtraBold',
    },
    peerName: {
        fontSize: scaleFont(15),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    peerStatus: {
        fontSize: scaleFont(12),
        color: '#64748B',
        fontFamily: 'Outfit_400Regular',
    },
    peerImage: {
        width: '100%',
        height: scaleFont(180),
        borderRadius: scaleFont(14),
        backgroundColor: '#F8FAFC',
    },
    peerFailBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: scaleFont(12),
        borderRadius: scaleFont(12),
        gap: scaleFont(8),
    },
    peerFailText: {
        fontSize: scaleFont(13),
        fontWeight: '600',
        color: '#EF4444',
        fontFamily: 'Outfit_700Bold',
    },
    voteBar: {
        flexDirection: 'row',
        gap: scaleFont(12),
        marginTop: scaleFont(16),
    },
    voteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(12),
        gap: scaleFont(8),
    },
    btnReject: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    btnConfirm: {
        backgroundColor: '#10B981',
    },
    btnRejectText: {
        color: '#EF4444',
        fontSize: scaleFont(14),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    btnConfirmText: {
        color: '#FFF',
        fontSize: scaleFont(14),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    votedFeedback: {
        textAlign: 'center',
        marginTop: scaleFont(12),
        fontSize: scaleFont(12),
        color: '#10B981',
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    // COMPLETION
    completionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scaleFont(16),
        borderRadius: scaleFont(20),
        marginBottom: scaleFont(20),
        gap: scaleFont(12),
    },
    compSuccess: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7' },
    compFailed: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
    compIcon: {
        width: scaleFont(48),
        height: scaleFont(48),
        borderRadius: scaleFont(14),
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    compTitle: {
        fontSize: scaleFont(16),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    compSub: {
        fontSize: scaleFont(12),
        color: '#64748B',
        fontFamily: 'Outfit_400Regular',
    },
    settleBtn: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(14),
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // WAIT CARD
    waitCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: scaleFont(24),
        padding: scaleFont(24),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FCD34D',
        marginBottom: scaleFont(32),
    },
    waitIconBox: {
        width: scaleFont(64),
        height: scaleFont(64),
        borderRadius: scaleFont(32),
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(16),
    },
    waitTitle: {
        fontSize: scaleFont(20),
        fontWeight: '800',
        color: '#B45309',
        marginBottom: scaleFont(8),
        fontFamily: 'Outfit_800ExtraBold',
    },
    waitSub: {
        fontSize: scaleFont(14),
        color: '#92400E',
        textAlign: 'center',
        marginBottom: scaleFont(20),
        lineHeight: scaleFont(20),
        fontFamily: 'Outfit_400Regular',
    },
    waitCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: scaleFont(20),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(12),
        gap: scaleFont(12),
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    waitCode: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#5B2DAD',
        fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: 2,
    }
});
