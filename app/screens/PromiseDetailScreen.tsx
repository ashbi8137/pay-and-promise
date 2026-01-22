import { Ionicons } from '@expo/vector-icons';
import * as ExpoClipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
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
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function PromiseDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Parse the promise data from params
    const promiseData = params.promise ? JSON.parse(params.promise as string) : null;

    if (!promiseData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: theme.icon }]}>Promise details not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Removed description from destructuring
    const { title, duration, numPeople, amountPerPerson, totalAmount, participants, invite_code } = promiseData;

    const [updating, setUpdating] = React.useState(false);
    const [checkins, setCheckins] = React.useState<{ date: string, status: string }[]>([]);
    const [todayStatus, setTodayStatus] = React.useState<'done' | 'failed' | null>(null);
    const [realParticipantCount, setRealParticipantCount] = React.useState(numPeople);
    const [currentPromiseStatus, setCurrentPromiseStatus] = React.useState(promiseData.status);

    // NEW State for Peer Verification
    const [submissions, setSubmissions] = React.useState<any[]>([]);
    const [myVotes, setMyVotes] = React.useState<string[]>([]);
    const [userId, setUserId] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Fetch initial data
        fetchCheckins();
        fetchParticipantCount();
        fetchDailyReview();
        fetchLatestPromiseStatus();

        // Subscribe to Realtime Changes
        const subChannel = supabase.channel('room_signatures')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'promise_submissions', filter: `promise_id=eq.${promiseData.id}` },
                () => {
                    console.log('Realtime update: promise_submissions');
                    fetchDailyReview();
                    fetchCheckins(); // Sync progress bar
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'submission_verifications' },
                (payload) => {
                    console.log('Realtime update: submission_verifications', payload);
                    // Re-fetch to get updated submission status
                    fetchDailyReview();
                    fetchCheckins(); // Sync progress bar
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'promise_participants', filter: `promise_id=eq.${promiseData.id}` },
                () => {
                    console.log('Realtime update: promise_participants');
                    fetchParticipantCount();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'promises', filter: `id=eq.${promiseData.id}` },
                (payload) => {
                    console.log('Realtime update: promise status', payload.new.status);
                    setCurrentPromiseStatus(payload.new.status);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subChannel);
        };
    }, []);

    const [userNames, setUserNames] = React.useState<Record<string, string>>({});

    const handleCopyCode = async () => {
        if (!invite_code) return;
        await ExpoClipboard.setStringAsync(invite_code);
        Alert.alert("Copied!", "Invite code copied to clipboard.");
    };

    const fetchDailyReview = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch Submissions for Today
        const { data: subs, error } = await supabase
            .from('promise_submissions')
            .select('*')
            .eq('promise_id', promiseData.id)
            .eq('date', todayStr);

        if (error) console.error("Error fetching submissions:", error);

        if (subs) {
            setSubmissions(subs);

            // Fetch Names for these users
            const userIds = subs.map(s => s.user_id);
            if (userIds.length > 0) {
                const { data: names } = await supabase
                    .rpc('get_user_names', { user_ids: userIds });

                if (names) {
                    const nameMap: Record<string, string> = {};
                    names.forEach((n: any) => {
                        nameMap[n.user_id] = n.full_name;
                    });
                    setUserNames(nameMap);
                }
            }
        }

        // 2. Fetch My Votes on these submissions
        if (subs && subs.length > 0) {
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
        setUpdating(true);
        try {
            const { error } = await supabase.from('submission_verifications').insert({
                submission_id: submissionId,
                verifier_user_id: userId,
                decision: decision
            });
            if (error) throw error;

            // Optimistic Update: Add to myVotes immediately
            setMyVotes(prev => [...prev, submissionId]);

            // Fetch will be triggered by realtime, but we can optimistically update or wait
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not record vote.");
        } finally {
            setUpdating(false);
        }
    };

    // Existing functions...
    const [joinedParticipants, setJoinedParticipants] = React.useState<any[]>([]);

    const fetchParticipantCount = async () => {
        // Fetch raw count
        const { count, data } = await supabase
            .from('promise_participants')
            .select('user_id', { count: 'exact' })
            .eq('promise_id', promiseData.id);

        if (count !== null) setRealParticipantCount(count);

        // Fetch Names for these users
        if (data && data.length > 0) {
            const userIds = data.map(d => d.user_id);
            const { data: names } = await supabase.rpc('get_user_names', { user_ids: userIds });

            if (names) {
                // Map to simple array of objects
                const formatted = names.map((n: any) => ({
                    name: n.full_name?.split(' ')[0] || n.email?.split('@')[0] || "User", // First name only preference
                    id: n.user_id
                }));
                setJoinedParticipants(formatted);
            }
        }
    };

    const fetchLatestPromiseStatus = async () => {
        const { data, error } = await supabase
            .from('promises')
            .select('status')
            .eq('id', promiseData.id)
            .single();

        if (data) {
            setCurrentPromiseStatus(data.status);
        }
    };

    const fetchCheckins = async () => {
        try {
            // SWITCH TO PROMISE_SUBMISSIONS AS SOURCE OF TRUTH
            // daily_checkins table was desyncing. 
            // We map: verified -> done, rejected -> failed, pending -> pending
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('promise_submissions')
                .select('date, status')
                .eq('promise_id', promiseData.id)
                .eq('user_id', user.id) // <--- CRITICAL FIX: Only fetch MY submissions
                .order('date', { ascending: false });

            if (data) {
                // Map to 'done' | 'failed' | 'pending' convention used by UI
                const mappedCheckins = data.map(item => ({
                    date: item.date,
                    status: item.status === 'verified' ? 'done' :
                        (item.status === 'rejected' ? 'failed' : 'pending')
                }));

                setCheckins(mappedCheckins);

                // Auto-Complete Promise if Duration Met (Logic remains similar but based on mapped data)
                const completedCount = mappedCheckins.filter(c => c.status === 'done' || c.status === 'failed').length;
                if (completedCount >= duration) {
                    await supabase
                        .from('promises')
                        .update({ status: 'completed' })
                        .eq('id', promiseData.id)
                        .eq('status', 'active');
                }

                // Check if submitted today
                const todayStr = new Date().toISOString().split('T')[0];
                const todayEntry = mappedCheckins.find(c => c.date === todayStr);

                // If today is rejected -> failed
                // If today is verified -> done
                // If today is pending -> pending (but UI might want to know if I submitted)
                // The original UI used 'done' | 'failed' to block inputs. 
                // We need to be careful: if 'pending', we should probably show the "Pending Verification" state, not the input buttons.
                // existing logic: setTodayStatus(todayEntry.status as 'done' | 'failed')

                if (todayEntry) {
                    if (todayEntry.status === 'done' || todayEntry.status === 'failed') {
                        setTodayStatus(todayEntry.status);
                    } else {
                        // Pending... usually handled by renderDailyReview checking submissions
                        setTodayStatus(null);
                    }
                } else {
                    setTodayStatus(null);
                }
            }
        } catch (e) {
            console.error('Error fetching checkins:', e);
        }
    };

    const handlePhotoCheckIn = async () => {
        // 0. Validation: All peers must join
        if (realParticipantCount < numPeople) {
            Alert.alert("Waiting for Peers", "All peers must join the promise before uploading proof.");
            return;
        }

        // 1. Request Permission
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Refused", "You must allow camera access to prove your promise.");
            return;
        }

        // 2. Launch Camera
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: false, // Skip cropping for faster upload
            quality: 0.5, // Save bandwidth
        });

        if (!result.canceled) {
            setUpdating(true); // Show loading

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 3. Upload Image
                const photo = result.assets[0];
                const ext = photo.uri.substring(photo.uri.lastIndexOf('.') + 1);
                const fileName = `${user.id}/${new Date().getTime()}.${ext}`;
                const formData = new FormData();

                formData.append('file', {
                    uri: photo.uri,
                    name: fileName,
                    type: photo.mimeType || `image/${ext}`
                } as any);

                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('proofs')
                    .upload(fileName, formData, {
                        contentType: photo.mimeType || `image/${ext}`,
                        upsert: false
                    });

                if (uploadError) {
                    throw new Error('Upload failed: ' + uploadError.message);
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('proofs')
                    .getPublicUrl(fileName);

                // 4. Save Check-In (Pending Verification)
                const dateStr = new Date().toISOString().split('T')[0];
                const { error: checkinError } = await supabase
                    .from('promise_submissions')
                    .insert({
                        promise_id: promiseData.id,
                        user_id: user.id,
                        date: dateStr,
                        image_url: publicUrl,
                        status: 'pending'
                    });

                if (checkinError) throw checkinError;

                Alert.alert("Proof Submitted!", "Your Check-in is PENDING. Ask peers to verify it.");
                // Immediately refresh to show the submission
                fetchDailyReview();
            } catch (e) {
                Alert.alert("Error", "Failed to upload proof. Please try again.");
                console.error(e);
            } finally {
                setUpdating(false);
            }
        }
    };

    const handleCheckIn = async (status: 'done' | 'failed') => {
        if (updating) return;

        // If 'Done', Require Photo (Branch Logic)
        if (status === 'done') {
            Alert.alert(
                'Photo Proof Required',
                'To mark this as done, you must take a live photo as proof.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Open Camera',
                        onPress: handlePhotoCheckIn
                    }
                ]
            );
            return;
        }

        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Survivor Calculation Logic
        // 1. Daily Stake
        const dailyStake = amountPerPerson / duration;

        Alert.alert(
            'Mark as Failed?',
            `You missed it. You will lose ₹${dailyStake.toFixed(0)} to the pool.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Failure',
                    style: 'destructive',
                    onPress: async () => {
                        setUpdating(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return; // user is guaranteed if we are here


                            // 1. Record Check-in (Failed)
                            const { error: checkinError } = await supabase
                                .from('daily_checkins')
                                .insert({
                                    promise_id: promiseData.id,
                                    user_id: user.id,
                                    date: dateStr,
                                    status: status
                                });

                            if (checkinError) {
                                if (checkinError.code === '23505') { // Unique violation
                                    Alert.alert('Already Updated', 'You have already checked in for this promise today.');
                                } else {
                                    throw checkinError;
                                }
                            } else {
                                // 2. If Failed -> Handle Penalty
                                if (status === 'failed') {
                                    // A. Insert REJECTED submission (Strict Logic)
                                    await supabase.from('promise_submissions').insert({
                                        promise_id: promiseData.id,
                                        user_id: user.id,
                                        date: dateStr,
                                        image_url: 'manual_fail',
                                        status: 'rejected'
                                    });

                                    // B. Record Penalty for ME
                                    const myName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || "Someone";

                                    await supabase.from('ledger').insert({
                                        promise_id: promiseData.id,
                                        user_id: user.id,
                                        amount: -dailyStake,
                                        type: 'penalty',
                                        description: `You missed a day in ${promiseData.title}`
                                    });

                                    // Trigger verification check (might settle day if others are done)
                                    await supabase.rpc('check_and_finalize_verification', { p_promise_id: promiseData.id, p_date: dateStr });
                                }

                                setTodayStatus(status);
                                // Realtime handles refresh
                            }
                        } catch (e) {
                            Alert.alert('Error', 'An unexpected error occurred.');
                            console.error(e);
                        } finally {
                            setUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    // State for Refresh
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchCheckins(),
                fetchParticipantCount(),
                fetchDailyReview()
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [promiseData.id]);

    const renderAnalytics = () => {
        const totalDuration = duration || 7;
        const days = [];

        // Safety: ensure we have a start date, else fallback to today - duration (visual fix)
        let startDate = new Date();
        if (promiseData.created_at) {
            startDate = new Date(promiseData.created_at);
        }

        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < totalDuration; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];

            // Find checkin
            const checkin = checkins.find(c => c.date === dateStr);

            let status = 'pending';
            if (checkin) {
                status = checkin.status;
            } else if (dateStr < todayStr) {
                // Past day with no checkin? Strictly speaking this might be 'failed' or 'skipped'
                // But for now let's leave as pending (gray) or maybe 'missed' if we want to show red outline
                // User said "color of done/fail".
                status = 'pending';
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
                <Text style={styles.sectionTitle}>Journey Map</Text>
                <View style={styles.analyticsCard}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineContainer}>
                        {days.map((day, index) => {
                            const isLast = index === days.length - 1;
                            return (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineTopRow}>
                                        {/* Connector Line (Right) */}
                                        {!isLast && (
                                            <View style={[
                                                styles.connectorLine,
                                                (day.status === 'done' || day.status === 'failed') && styles.connectorActive
                                            ]} />
                                        )}

                                        {/* The Circle */}
                                        <View style={[
                                            styles.statusDot,
                                            day.status === 'done' && styles.dotDone,
                                            day.status === 'failed' && styles.dotFailed,
                                            day.status === 'pending' && styles.dotPending,
                                            // Add Glow for today or active
                                            day.isToday && { borderColor: '#4F46E5', borderWidth: 2 }
                                        ]}>
                                            {day.status === 'done' && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                            {day.status === 'failed' && <Ionicons name="close" size={14} color="#FFF" />}
                                            {day.status === 'pending' && <Text style={{ fontSize: 9, color: '#94A3B8' }}>{day.dayNum}</Text>}
                                        </View>
                                    </View>
                                    <Text style={[
                                        styles.dayNumText,
                                        day.isToday && styles.dayNumActive
                                    ]}>
                                        {day.dateLabel}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.progressSummary}>
                        <Text style={styles.progressText}>
                            {checkins.filter(c => c.status === 'done').length} <Text style={{ fontWeight: '400', color: '#64748B' }}>Done</Text>
                        </Text>
                        <View style={styles.verticalDivider} />
                        <Text style={styles.progressText}>
                            {checkins.filter(c => c.status === 'failed').length} <Text style={{ fontWeight: '400', color: '#64748B' }}>Failed</Text>
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderDailyReview = () => {
        // Find my submission
        const mySub = submissions.find(s => s.user_id === userId);
        const othersSubmissions = submissions.filter(s => s.user_id !== userId);

        return (
            <View style={styles.section}>
                {/* 1. MY TASK SECTION */}
                <Text style={styles.sectionTitle}>Your Daily Task</Text>

                {mySub ? (
                    <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                            <Text style={styles.participantName}>You</Text>
                            <View style={[styles.statusBadge,
                            mySub.status === 'verified' ? styles.badgeGreen :
                                mySub.status === 'rejected' ? styles.badgeRed : styles.badgeYellow
                            ]}>
                                <Text style={styles.statusText}>{mySub.status.toUpperCase()}</Text>
                            </View>
                        </View>
                        {mySub.image_url === 'manual_fail' ? (
                            <View style={styles.autoFailPlaceholder}>
                                <Ionicons name="close-circle" size={40} color="#EF4444" />
                                <Text style={styles.autoFailText}>You marked this as Failed</Text>
                            </View>
                        ) : (
                            <>
                                <Image source={{ uri: mySub.image_url }} style={styles.proofImage} />
                                {mySub.status === 'pending' && (
                                    <Text style={styles.analyticsFooter}>Waiting for other members to verify...</Text>
                                )}
                            </>
                        )}
                    </View>
                ) : (
                    /* UPLOAD ACTIONS - Only if NO submission yet */
                    todayStatus !== 'failed' ? (
                        <View style={{ marginBottom: 24 }}>
                            <TouchableOpacity style={styles.cameraButton} onPress={handlePhotoCheckIn}>
                                <Ionicons name="camera" size={24} color="#FFF" />
                                <Text style={styles.cameraButtonText}>Submit Today's Proof</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleCheckIn('failed')}>
                                <Text style={styles.failLink}>I failed today (Instant Penalty)</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.reviewCard}>
                            <Text style={[styles.autoFailText, { textAlign: 'center', marginBottom: 8 }]}>Day Failed</Text>
                            <Text style={styles.analyticsFooter}>You have accepted the penalty for today.</Text>
                        </View>
                    )
                )}

                {/* 2. PEER REVIEW SECTION */}
                {othersSubmissions.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Peer Reviews</Text>
                        {othersSubmissions.map((sub) => {
                            const isVoted = myVotes.includes(sub.id);
                            const name = userNames[sub.user_id] || `User ...${sub.user_id.slice(0, 4)}`;
                            const isAutoFail = sub.image_url === 'auto_fail_placeholder' || sub.image_url === 'manual_fail';

                            return (
                                <View key={sub.id} style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <Text style={styles.participantName}>{name}</Text>
                                        <View style={[styles.statusBadge,
                                        sub.status === 'verified' ? styles.badgeGreen :
                                            sub.status === 'rejected' ? styles.badgeRed : styles.badgeYellow
                                        ]}>
                                            <Text style={styles.statusText}>
                                                {sub.status === 'rejected' ? 'FAILED' : sub.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    {isAutoFail ? (
                                        <View style={styles.autoFailPlaceholder}>
                                            <Ionicons name="alert-circle" size={40} color="#EF4444" />
                                            <Text style={styles.autoFailText}>Missed Submission</Text>
                                        </View>
                                    ) : (
                                        <Image source={{ uri: sub.image_url }} style={styles.proofImage} />
                                    )}

                                    {!isVoted && !isAutoFail && sub.status === 'pending' && (
                                        <View style={styles.voteButtons}>
                                            <TouchableOpacity style={[styles.voteButton, styles.voteConfirm]}
                                                onPress={() => handleVote(sub.id, 'confirm')}>
                                                <Text style={styles.voteText}>Confirm</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.voteButton, styles.voteReject]}
                                                onPress={() => handleVote(sub.id, 'reject')}>
                                                <Text style={styles.voteText}>Reject</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {isVoted && (
                                        <Text style={styles.votedText}>You voted on this.</Text>
                                    )}
                                </View>
                            );
                        })}
                    </>
                )}
            </View>
        );
    };

    const renderCompletionCard = () => {
        if (currentPromiseStatus !== 'completed' && currentPromiseStatus !== 'failed') return null;

        const isSuccess = currentPromiseStatus === 'completed';

        return (
            <View style={[styles.section, { marginBottom: 32 }]}>
                <View style={[styles.completionCard, isSuccess ? styles.completionSuccess : styles.completionFailed]}>
                    <Ionicons
                        name={isSuccess ? "trophy" : "alert-circle"}
                        size={48}
                        color={isSuccess ? "#166534" : "#991B1B"}
                        style={{ marginBottom: 12 }}
                    />
                    <Text style={[styles.completionTitle, { color: isSuccess ? "#166534" : "#991B1B" }]}>
                        {isSuccess ? "Promise Completed!" : "Promise Failed"}
                    </Text>
                    <Text style={styles.completionText}>
                        {isSuccess
                            ? "You have successfully completed the promise for the entire duration! Check your gains/losses and settle up with peers."
                            : "This promise has ended. Check the final report to see the outcome."}
                    </Text>

                    <TouchableOpacity
                        style={[styles.reportButton, isSuccess ? { backgroundColor: '#166534' } : { backgroundColor: '#991B1B' }]}
                        onPress={() => router.push({
                            pathname: '/screens/PromiseReportScreen',
                            params: { promiseId: promiseData.id }
                        })}
                    >
                        <Text style={styles.reportButtonText}>View Final Report & Settlement</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >


                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.headerBackButton, { backgroundColor: theme.card, shadowColor: theme.icon }]}>
                        <Ionicons name="arrow-back" size={24} color={theme.icon} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Invite Code Card (NEW) */}
                {invite_code && (
                    <View style={[styles.inviteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View>
                            <Text style={[styles.inviteLabel, { color: theme.icon }]}>Invite Code</Text>
                            <Text style={[styles.inviteCode, { color: theme.text }]}>{invite_code}</Text>
                        </View>
                        <TouchableOpacity onPress={handleCopyCode} style={{ padding: 8 }}>
                            <Ionicons name="copy-outline" size={24} color={theme.icon} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main Details Card */}
                <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.tint }]}>
                    <View style={styles.row}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Duration</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{duration} Days</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Stake / Person</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>₹ {amountPerPerson}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.border }]} />

                    <View style={[styles.totalContainer, { backgroundColor: theme.background }]}>
                        <Text style={[styles.totalLabel, { color: theme.icon }]}>Total Pool</Text>
                        <Text style={[styles.totalValue, { color: theme.text }]}>₹ {totalAmount}</Text>
                    </View>
                </View>

                {/* Analytics Section */}
                {renderAnalytics()}

                {/* Participants */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Participants ({realParticipantCount})</Text>
                    <View style={styles.participantsList}>
                        {joinedParticipants.length > 0 ? (
                            joinedParticipants.map((p: any, index: number) => (
                                <View key={index} style={[styles.participantChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <Ionicons name="person-circle" size={20} color={theme.icon} />
                                    <Text style={[styles.participantText, { color: theme.text }]}>{p.name || 'Unknown'}</Text>
                                </View>
                            ))
                        ) : (
                            // Fallback (Should rarely show if logic is correct, as creator is always joined)
                            <Text style={{ color: theme.icon, fontSize: 13, fontStyle: 'italic' }}>Waiting for others to join...</Text>
                        )}

                        {/* Invites Remaining Helper */}
                        {joinedParticipants.length < numPeople && (
                            <Text style={{ color: theme.icon, fontSize: 12, marginTop: 8, width: '100%' }}>
                                {numPeople - joinedParticipants.length} spots remaining. Share the code!
                            </Text>
                        )}
                    </View>
                </View>


                {/* Daily Check-in OR Completion Card */}
                {currentPromiseStatus === 'active' ? renderDailyReview() : renderCompletionCard()}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 100 : 80, // Increased top spacing
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerBackButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    inviteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inviteLabel: {
        fontSize: 12,
        color: '#64748B',
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    inviteCode: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: 2,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    totalContainer: {
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 12,
    },
    totalLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    participantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    participantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    participantText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    checkInSection: {
        marginTop: 8,
    },
    checkInTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    checkInSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
    },
    checkInButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    checkInButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    successButton: {
        backgroundColor: '#22C55E', // Green
    },
    failButton: {
        backgroundColor: '#EF4444', // Red
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#334155',
        fontWeight: '600',
    },
    // Analytics
    analyticsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 60,
        marginBottom: 12,
    },
    dayColumn: {
        alignItems: 'center',
        gap: 8,
    },
    chartBar: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    barDone: {
        backgroundColor: '#22C55E',
        height: 40, // Taller bar for done
    },
    barFailed: {
        backgroundColor: '#EF4444',
        height: 20,
    },
    barPending: {
        backgroundColor: '#E2E8F0',
        height: 4,
    },
    dayLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    analyticsFooter: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 4,
    },
    // Status Card
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        gap: 16,
        marginTop: 8,
    },
    statusCardSuccess: {
        backgroundColor: '#DCFCE7', // Light green
    },
    statusCardFail: {
        backgroundColor: '#FEE2E2', // Light red
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    statusSubtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    // NEW Peer Verification Styles
    reviewCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    participantName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeGreen: { backgroundColor: '#DCFCE7' },
    badgeRed: { backgroundColor: '#FEE2E2' },
    badgeYellow: { backgroundColor: '#FEF9C3' },
    statusText: { fontSize: 10, fontWeight: '700', color: '#333' },
    proofImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        marginBottom: 8,
    },
    voteButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    voteButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    voteConfirm: { backgroundColor: '#16A34A' },
    voteReject: { backgroundColor: '#DC2626' },
    voteText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    votedText: { color: '#64748B', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
    emptyText: { textAlign: 'center', color: '#94A3B8', marginBottom: 20 },
    cameraButton: {
        backgroundColor: '#0F172A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    cameraButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    failLink: { textAlign: 'center', color: '#EF4444', marginTop: 16, textDecorationLine: 'underline' },
    autoFailPlaceholder: {
        height: 200,
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderStyle: 'dashed',
    },
    autoFailText: {
        fontSize: 16,
        color: '#B91C1C',
        fontWeight: '600',
        marginTop: 8,
    },
    // Progress Tracker Styles
    timelineContainer: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    timelineItem: {
        alignItems: 'center',
        marginRight: 0,
        width: 60, // Fixed width for alignment
    },
    timelineTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        width: '100%',
        justifyContent: 'center', // Center the dot
    },
    statusDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    dotDone: {
        backgroundColor: '#22C55E',
        borderColor: '#22C55E',
    },
    dotFailed: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    dotPending: {
        backgroundColor: '#F1F5F9',
        borderColor: '#CBD5E1',
    },
    glowDone: {
        elevation: 6,
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    glowFailed: {
        elevation: 6,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    connectorLine: {
        position: 'absolute',
        top: 11, // Center vertically (24/2 - 1)
        left: '50%', // Start from center of this item
        width: 60, // Reach to next center (matches item width)
        height: 2,
        backgroundColor: '#E2E8F0',
        zIndex: 1,
    },
    connectorActive: {
        backgroundColor: '#CBD5E1', // Slightly darker for path taken
    },
    dayNumText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    dayNumActive: {
        color: '#334155',
        fontWeight: '700',
    },
    progressSummary: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        backgroundColor: '#F8FAFC',
        paddingVertical: 8,
        borderRadius: 12,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    verticalDivider: {
        width: 1,
        height: 16,
        backgroundColor: '#CBD5E1',
        marginHorizontal: 16,
    },
    copyIconContainer: {
        padding: 4,
        backgroundColor: '#FFF',
        borderRadius: 8,
    },
    // Completion Card
    completionCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 24,
        borderWidth: 1,
    },
    completionSuccess: {
        backgroundColor: '#F0FDF4',
        borderColor: '#DCFCE7',
    },
    completionFailed: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    completionTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    completionText: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        maxWidth: '90%',
    },
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 8,
    },
    reportButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
