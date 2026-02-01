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
import { scaleFont } from '../utils/layout';

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

    const { title, duration, numPeople, amountPerPerson, totalAmount, invite_code } = promiseData;

    const [updating, setUpdating] = React.useState(false);
    const [checkins, setCheckins] = React.useState<{ date: string, status: string }[]>([]);
    const [todayStatus, setTodayStatus] = React.useState<'done' | 'failed' | null>(null);
    const [realParticipantCount, setRealParticipantCount] = React.useState(numPeople);
    const [currentPromiseStatus, setCurrentPromiseStatus] = React.useState(promiseData.status);

    const [submissions, setSubmissions] = React.useState<any[]>([]);
    const [myVotes, setMyVotes] = React.useState<string[]>([]);
    const [userId, setUserId] = React.useState<string | null>(null);
    const [userNames, setUserNames] = React.useState<Record<string, string>>({});
    const [joinedParticipants, setJoinedParticipants] = React.useState<any[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchInitialData();

        const subChannel = supabase.channel(`promise_${promiseData.id}`)
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

        const todayStr = new Date().toISOString().split('T')[0];

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
            const dateStr = new Date().toISOString().split('T')[0];
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
        const { count, data } = await supabase
            .from('promise_participants')
            .select('user_id', { count: 'exact' })
            .eq('promise_id', promiseData.id);

        if (count !== null) setRealParticipantCount(count);

        if (data && data.length > 0) {
            const userIds = data.map(d => d.user_id);
            const { data: names } = await supabase.rpc('get_user_names', { user_ids: userIds });
            if (names) {
                const formatted = names.map((n: any) => ({
                    name: n.full_name?.split(' ')[0] || n.email?.split('@')[0] || "User",
                    id: n.user_id
                }));
                setJoinedParticipants(formatted);
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
                if (completedCount >= duration) {
                    await supabase.from('promises').update({ status: 'completed' }).eq('id', promiseData.id).eq('status', 'active');
                }

                const todayStr = new Date().toISOString().split('T')[0];
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
            allowsEditing: false,
            quality: 0.5,
        });

        if (!result.canceled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setUpdating(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const photo = result.assets[0];
                const ext = photo.uri.substring(photo.uri.lastIndexOf('.') + 1);
                const fileName = `${user.id}/${new Date().getTime()}.${ext}`;
                const formData = new FormData();

                formData.append('file', {
                    uri: photo.uri,
                    name: fileName,
                    type: photo.mimeType || `image/${ext}`
                } as any);

                const { error: uploadError } = await supabase.storage.from('proofs').upload(fileName, formData, {
                    contentType: photo.mimeType || `image/${ext}`,
                    upsert: false
                });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(fileName);
                const dateStr = new Date().toISOString().split('T')[0];

                // Check for existing submission to UPSERT
                const { data: existing } = await supabase.from('promise_submissions')
                    .select('id')
                    .eq('promise_id', promiseData.id)
                    .eq('user_id', user.id)
                    .eq('date', dateStr)
                    .single();

                let checkinError;
                if (existing) {
                    const { error } = await supabase.from('promise_submissions').update({
                        image_url: publicUrl,
                        status: 'pending' // Reset to pending on retry
                    }).eq('id', existing.id);
                    checkinError = error;
                } else {
                    const { error } = await supabase.from('promise_submissions').insert({
                        promise_id: promiseData.id,
                        user_id: user.id,
                        date: dateStr,
                        image_url: publicUrl,
                        status: 'pending'
                    });
                    checkinError = error;
                }

                if (checkinError) throw checkinError;

                // Also reset any decision votes for this day so people can vote again?
                // For now, simpler to just reset status. The votes link to specific submission_id?
                // If I update rows, the submission_id stays same. Old verifications linked to it might persist.
                // Ideally, clear old verifications? 
                if (existing) {
                    await supabase.from('submission_verifications').delete().eq('submission_id', existing.id);
                    setMyVotes(prev => prev.filter(id => id !== existing.id)); // Clear local cache if any (though this is for others' task)
                }

                showAlert({ title: "Submitted!", message: "Proof is pending verification.", type: "success" });
                fetchDailyReview();
            } catch (e) {
                console.error(e);
                showAlert({ title: "Error", message: "Failed to upload proof.", type: "error" });
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

        const dailyStake = amountPerPerson / duration;
        showAlert({
            title: 'Mark as Failed?',
            message: `You will lose ₹${dailyStake.toFixed(0)} to the pool.`,
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

                            const dateStr = new Date().toISOString().split('T')[0];
                            const { error: checkinError } = await supabase.from('daily_checkins').insert({
                                promise_id: promiseData.id,
                                user_id: user.id,
                                date: dateStr,
                                status: status
                            });

                            if (checkinError) {
                                if (checkinError.code !== '23505') throw checkinError;
                            } else {
                                await supabase.from('promise_submissions').insert({
                                    promise_id: promiseData.id,
                                    user_id: user.id,
                                    date: dateStr,
                                    image_url: 'manual_fail',
                                    status: 'rejected'
                                });
                                await supabase.rpc('check_and_finalize_verification', { p_promise_id: promiseData.id, p_date: dateStr });
                                setTodayStatus(status);
                            }
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
                    colors={['#4F46E5', '#7C3AED']}
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
                            <View style={styles.heroStatItem}>
                                <Ionicons name="people-outline" size={14} color="#FFF" opacity={0.7} />
                                <Text style={styles.heroStatText}>{realParticipantCount}/{numPeople} Peers</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.heroBottom}>
                        <View style={styles.stakePill}>
                            <Text style={styles.stakeLabel}>STAKE/PERSON</Text>
                            <Text style={styles.stakeValue}>₹{amountPerPerson}</Text>
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
        let startDate = promiseData.created_at ? new Date(promiseData.created_at) : new Date();
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < totalDuration; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const checkin = checkins.find(c => c.date === dateStr);

            let status = 'pending';
            if (checkin) status = checkin.status;

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
                                    <Text style={[styles.dayNum, day.isToday && { color: '#4F46E5' }]}>{day.dayNum}</Text>
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
                                <Image source={{ uri: mySub.image_url }} style={styles.submissionImage} />

                                {mySub.status === 'rejected' && (
                                    <View style={{ marginTop: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12 }}>
                                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13, flex: 1 }}>
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
                                        <Text style={styles.waitingText}>Waiting for peers...</Text>
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
                            <TouchableOpacity style={styles.mainActionBtn} onPress={handlePhotoCheckIn}>
                                <Ionicons name="camera" size={24} color="#FFF" />
                                <Text style={styles.mainActionText}>Submit Proof</Text>
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
                    <Text style={styles.compSub}>{isSuccess ? "You've proven your commitment." : "Check the settlement to close out."}</Text>
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
                    <ActivityIndicator size="large" color="#4F46E5" />
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
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
                >
                    {renderHero()}
                    {renderCompletion()}
                    {renderJourneyMap()}
                    {renderDailyActions()}
                    <View style={{ height: 40 }} />
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
        paddingHorizontal: scaleFont(20),
        paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10),
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
        backgroundColor: '#4F46E5',
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
        shadowColor: '#4F46E5',
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
        borderColor: '#4F46E5',
        shadowColor: '#4F46E5',
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
        color: '#4F46E5',
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
        backgroundColor: '#4F46E5',
        paddingHorizontal: scaleFont(28),
        paddingVertical: scaleFont(16),
        borderRadius: scaleFont(18),
        alignItems: 'center',
        gap: scaleFont(10),
        elevation: scaleFont(6),
        shadowColor: '#4F46E5',
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
        color: '#4F46E5',
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
    }
});
