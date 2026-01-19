import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function PromiseDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse the promise data from params
    const promiseData = params.promise ? JSON.parse(params.promise as string) : null;

    if (!promiseData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Promise details not found.</Text>
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

    // NEW State for Peer Verification
    const [submissions, setSubmissions] = React.useState<any[]>([]);
    const [myVotes, setMyVotes] = React.useState<string[]>([]);
    const [userId, setUserId] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Fetch initial data
        fetchCheckins();
        fetchParticipantCount();
        fetchDailyReview();

        // Subscribe to Realtime Changes
        const subChannel = supabase.channel('room_signatures')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'promise_submissions', filter: `promise_id=eq.${promiseData.id}` },
                () => {
                    console.log('Realtime update: promise_submissions');
                    fetchDailyReview();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'submission_verifications' },
                () => {
                    console.log('Realtime update: submission_verifications');
                    fetchDailyReview();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subChannel);
        };
    }, []);

    const [userNames, setUserNames] = React.useState<Record<string, string>>({});

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
            // Filter out auto-fail placeholders from the UI review list
            // (Unless we want to show them as failed cards, which is better)
            // But user asked to "fix automatic rejection placeholder", implying it looks bad.
            // Let's filter placeholders out OR handle them as "Missed Day" cards.
            // User request: "automatic rejection placeholder is also present. fix the isuue." -> Likely hide the image.

            // Map names from the join logic? 
            // supabase-js doesn't join auth.users easily unless we have a public profile table 
            // OR we use the trick: select params if we have public wrapper.
            // BUT: Standard way is to rely on 'promise_participants' having names or fetch them.
            // Let's try to map from the 'participants' param we already have!

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

            fetchDailyReview(); // Refresh UI
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not record vote.");
        } finally {
            setUpdating(false);
        }
    };

    // Existing functions...
    const fetchParticipantCount = async () => {
        const { count } = await supabase
            .from('promise_participants')
            .select('*', { count: 'exact', head: true })
            .eq('promise_id', promiseData.id);

        if (count !== null) setRealParticipantCount(count);
    };

    const fetchCheckins = async () => {
        try {
            const { data, error } = await supabase
                .from('daily_checkins')
                .select('date, status')
                .eq('promise_id', promiseData.id)
                .order('date', { ascending: false });

            if (data) {
                setCheckins(data);

                // Check if checked in today
                const todayStr = new Date().toISOString().split('T')[0];
                const todayEntry = data.find(c => c.date === todayStr);
                if (todayEntry) {
                    setTodayStatus(todayEntry.status as 'done' | 'failed');
                }
            }
        } catch (e) {
            console.error('Error fetching checkins:', e);
        }
    };

    const handlePhotoCheckIn = async () => {
        // 1. Request Permission
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Refused", "You must allow camera access to prove your promise.");
            return;
        }

        // 2. Launch Camera
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
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

                // Get Public URL (if bucket is public) or simple path
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
                fetchDailyReview(); // Refresh own list

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


                            // 1. Record Check-in
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

                                    // Redistribution is now handled by the Backend 'check_and_settle_day' logic
                                    // potentially triggered by other votes or a cron.
                                    // ideally we call the RPC here to try settling if everyone else is done.
                                    await supabase.rpc('check_and_settle_day', { p_promise_id: promiseData.id, p_date: dateStr });
                                }

                                setTodayStatus(status);
                                fetchCheckins();
                                fetchDailyReview();
                                // Optionally show success feedback
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
        // Last N Days Logic
        const days = [];
        const today = new Date();
        const totalDuration = duration || 7;

        for (let i = totalDuration - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const checkin = checkins.find(c => c.date === dateStr);
            days.push({
                date: dateStr,
                dayLabel: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                status: checkin ? checkin.status : 'pending',
            });
        }

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Progress (Last {totalDuration} Days)</Text>
                <View style={styles.analyticsCard}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chartRow}>
                            {days.map((day, index) => (
                                <View key={index} style={styles.dayColumn}>
                                    <View style={[
                                        styles.chartBar,
                                        day.status === 'done' && styles.barDone,
                                        day.status === 'failed' && styles.barFailed,
                                        day.status === 'pending' && styles.barPending
                                    ]} />
                                    <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                    <Text style={styles.analyticsFooter}>
                        {checkins.filter(c => c.status === 'done').length} days completed out of {totalDuration}
                    </Text>
                </View>
            </View>
        );
    };

    const renderDailyReview = () => {
        // Find my submission
        const mySub = submissions.find(s => s.user_id === userId);

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Review</Text>

                {submissions.length === 0 && (
                    <Text style={styles.emptyText}>No submissions yet today.</Text>
                )}

                {submissions.map((sub) => {
                    const isMe = sub.user_id === userId;
                    const isVoted = myVotes.includes(sub.id);
                    // Match user_id to participant name from params if available
                    // participants -> [{name, number?}, ...] - Wait, we don't have user_id in params participants easily?
                    // Actually, promises table stores participants as JSONB. 
                    // Let's try to use the `users` select above if it worked, otherwise fallback.
                    // Since joining auth.users is tricky,

                    let name = isMe ? "You" : (userNames[sub.user_id] || `User ...${sub.user_id.slice(0, 4)}`);

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

                            {!isMe && sub.status === 'pending' && !isVoted && !isAutoFail && (
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

                            {!isMe && isVoted && (
                                <Text style={styles.votedText}>You voted on this.</Text>
                            )}
                        </View>
                    );
                })}

                {!mySub && todayStatus !== 'failed' && (
                    <TouchableOpacity style={styles.cameraButton} onPress={handlePhotoCheckIn}>
                        <Ionicons name="camera" size={24} color="#FFF" />
                        <Text style={styles.cameraButtonText}>Submit Today's Proof</Text>
                    </TouchableOpacity>
                )}

                {!mySub && todayStatus !== 'done' && (
                    <TouchableOpacity onPress={() => handleCheckIn('failed')}>
                        <Text style={styles.failLink}>I failed today (Instant Penalty)</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Invite Code Card (NEW) */}
                {invite_code && (
                    <View style={styles.inviteCard}>
                        <View>
                            <Text style={styles.inviteLabel}>Invite Code</Text>
                            <Text style={styles.inviteCode}>{invite_code}</Text>
                        </View>
                        <Ionicons name="copy-outline" size={24} color="#64748B" />
                    </View>
                )}

                {/* Main Details Card */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValue}>{duration} Days</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Stake / Person</Text>
                            <Text style={styles.statValue}>₹ {amountPerPerson}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total Pool</Text>
                        <Text style={styles.totalValue}>₹ {totalAmount}</Text>
                    </View>
                </View>

                {/* Analytics Section */}
                {renderAnalytics()}

                {/* Participants */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Participants ({realParticipantCount})</Text>
                    <View style={styles.participantsList}>
                        {participants?.map((p: any, index: number) => (
                            <View key={index} style={styles.participantChip}>
                                <Ionicons name="person-circle" size={20} color="#64748B" />
                                <Text style={styles.participantText}>{p.name || p}</Text>
                            </View>
                        ))}
                    </View>
                </View>


                {/* Daily Check-in */}
                {renderDailyReview()}

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
        paddingTop: 80, // Increased top spacing
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
});
