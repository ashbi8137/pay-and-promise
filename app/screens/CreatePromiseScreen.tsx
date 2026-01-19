import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface Participant {
    name: string;
    number: string;
}

export default function CreatePromiseScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [numPeople, setNumPeople] = useState('');
    const [amountPerPerson, setAmountPerPerson] = useState('');

    // Participants State
    const [participantName, setParticipantName] = useState('');
    const [participantNumber, setParticipantNumber] = useState('');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [recentConnections, setRecentConnections] = useState<Participant[]>([]);

    React.useEffect(() => {
        fetchRecentConnections();
    }, []);

    const fetchRecentConnections = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Simple Logic: Get promises I created, look at their participants
            const { data: promises, error } = await supabase
                .from('promises')
                .select('participants')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (promises) {
                const uniqueMap = new Map<string, Participant>();

                promises.forEach(p => {
                    const parts: Participant[] = p.participants || [];
                    parts.forEach(part => {
                        // Filter out "You" and invalid entries
                        if (part.name !== 'You' && part.name && part.number) {
                            // Use number as key for uniqueness
                            if (!uniqueMap.has(part.number)) {
                                uniqueMap.set(part.number, part);
                            }
                        }
                    });
                });

                setRecentConnections(Array.from(uniqueMap.values()));
            }
        } catch (e) {
            console.log("Error fetching recents:", e);
        }
    };

    // Computed Values
    const totalAmount = (parseInt(numPeople || '0') * parseInt(amountPerPerson || '0'));

    // Logic: Total People includes "You". So limit for invites is numPeople - 1.
    const totalSlots = parseInt(numPeople || '0');
    const maxInvites = totalSlots > 1 ? totalSlots - 1 : 0;

    const invitesAdded = participants.length;

    const handleAddParticipant = () => {
        if (!participantName.trim()) {
            Alert.alert('Missing Name', 'Please enter a name for the participant.');
            return;
        }

        // Check limit
        if (totalSlots > 0 && invitesAdded >= maxInvites) {
            Alert.alert('Limit Reached', `You + ${maxInvites} others = ${totalSlots} people.`);
            return;
        }

        // Duplicate Check (Name-based for manual entries)
        if (participants.some(p => p.name.toLowerCase() === participantName.trim().toLowerCase())) {
            Alert.alert('Duplicate', 'This person is already added.');
            return;
        }

        // Use a placeholder for number if manual
        const newParticipant = {
            name: participantName.trim(),
            number: participantNumber.trim() || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };

        setParticipants([...participants, newParticipant]);
        setParticipantName('');
        setParticipantNumber('');
    };

    const handleRemoveParticipant = (index: number) => {
        const newParticipants = [...participants];
        newParticipants.splice(index, 1);
        setParticipants(newParticipants);
    };

    const handleCreatePromise = async () => {
        if (loading) return;

        // Validation
        if (!title.trim()) {
            Alert.alert('Missing Field', 'Please enter a title for your promise.');
            return;
        }
        if (!duration || parseInt(duration) <= 0) {
            Alert.alert('Invalid Input', 'Please enter a valid duration.');
            return;
        }
        if (!numPeople || parseInt(numPeople) <= 0) {
            Alert.alert('Invalid Input', 'Please enter the number of people.');
            return;
        }
        if (!amountPerPerson || parseInt(amountPerPerson) <= 0) {
            Alert.alert('Invalid Input', 'Please enter the amount per person.');
            return;
        }

        if (invitesAdded < maxInvites) {
            Alert.alert('Participants Missing', `Please add ${maxInvites - invitesAdded} more participants to match ${totalSlots} people.`);
            return;
        }

        setLoading(true);

        try {
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                Alert.alert('Error', 'You must be logged in to create a promise.');
                return;
            }

            // Generate Invite Code (Simple alphanumeric)
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Prepare Data
            // Note: We still store `participants` JSON for generic info, but key logic moves to `promise_participants`
            const finalParticipants = [
                { name: 'You', number: 'User' },
                ...participants
            ];

            // 1. Insert Promise
            const { data: promiseData, error: promiseError } = await supabase
                .from('promises')
                .insert({
                    title,
                    duration_days: parseInt(duration),
                    number_of_people: parseInt(numPeople),
                    amount_per_person: parseInt(amountPerPerson),
                    total_amount: totalAmount,
                    participants: finalParticipants, // UI legacy
                    created_by: user.id,
                    status: 'active',
                    invite_code: inviteCode
                })
                .select()
                .single();

            if (promiseError) {
                console.error('Supabase Insert Error:', promiseError);
                Alert.alert('Error', 'Failed to save promise. Please try again.');
                return;
            }

            // 2. Insert Creator into Participants Table
            const { error: participantError } = await supabase
                .from('promise_participants')
                .insert({
                    promise_id: promiseData.id,
                    user_id: user.id
                });

            if (participantError) {
                console.error('Participant Insert Error:', participantError);
                // Non-critical, but should be handled.
            }

            // Success
            Alert.alert('Success', 'Promise created successfully!');
            router.navigate('/screens/HomeScreen');

        } catch (e) {
            console.error('Creation Error:', e);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#334155" />
                        </TouchableOpacity>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>Create New Promise</Text>
                        <Text style={styles.quoteText}>“Add a small stake to stay accountable.”</Text>
                    </View>

                    {/* Section 1: Promise Details */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text-outline" size={20} color="#4338ca" />
                            <Text style={styles.sectionTitle}>Promise Details</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Morning Jog"
                                value={title}
                                onChangeText={setTitle}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Challenge Duration (Days)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="7"
                                value={duration}
                                onChangeText={setDuration}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    {/* Section 2: Money */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="wallet-outline" size={20} color="#4338ca" />
                            <Text style={styles.sectionTitle}>The Stakes</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Total Participants (Including You)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="3"
                                value={numPeople}
                                onChangeText={setNumPeople}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Amount per Person (₹)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="200"
                                value={amountPerPerson}
                                onChangeText={setAmountPerPerson}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                            <Text style={styles.helperText}>This is the amount each person will stake.</Text>
                        </View>

                        {/* Live Calculation Formula */}
                        {(parseInt(numPeople || '0') > 0 && parseInt(amountPerPerson || '0') > 0) && (
                            <View style={styles.formulaContainer}>
                                <Text style={styles.formulaText}>
                                    ₹{amountPerPerson} × {numPeople} people = <Text style={styles.formulaTotal}>₹{totalAmount}</Text> total pool
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Section 3: Participants */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people-outline" size={20} color="#4338ca" />
                            <Text style={styles.sectionTitle}>Participants</Text>
                        </View>

                        <View style={styles.formGroup}>
                            {totalSlots > 0 ? (
                                invitesAdded < maxInvites ? (
                                    <Text style={[styles.helperText, { color: '#4338ca', marginBottom: 8 }]}>
                                        Add {maxInvites - invitesAdded} more participant{maxInvites - invitesAdded > 1 ? 's' : ''}
                                    </Text>
                                ) : (
                                    <Text style={[styles.helperText, { color: '#166534', marginBottom: 8 }]}>
                                        All participants added!
                                    </Text>
                                )
                            ) : (
                                <Text style={styles.helperText}>Enter 'Total Participants' above to start adding friends.</Text>
                            )}

                            {/* Name Input Only (Mobile Removed) */}
                            <View style={styles.addParticipantRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    placeholder="Name (or select from below)"
                                    value={participantName}
                                    onChangeText={setParticipantName}
                                    placeholderTextColor="#94A3B8"
                                    editable={invitesAdded < maxInvites}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.addButton,
                                        (invitesAdded >= maxInvites && totalSlots > 0) && styles.disabledAddButton
                                    ]}
                                    onPress={handleAddParticipant}
                                    disabled={invitesAdded >= maxInvites && totalSlots > 0}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color={(invitesAdded >= maxInvites && totalSlots > 0) ? "#94A3B8" : "#4338ca"} />
                                    <Text style={[
                                        styles.addButtonText,
                                        (invitesAdded >= maxInvites && totalSlots > 0) && { color: "#94A3B8" }
                                    ]}>Add</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Recent Connections Section */}
                            <Text style={[styles.label, { marginTop: 12, marginBottom: 8, fontSize: 13 }]}>Recently Connected</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {recentConnections.length > 0 ? (
                                    recentConnections.map((user, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.recentChip}
                                            onPress={() => {
                                                // Auto-fill logic
                                                if (invitesAdded < maxInvites) {
                                                    setParticipants([...participants, { name: user.name, number: user.number || 'linked_user' }]);
                                                } else {
                                                    Alert.alert("Full", "No more slots available.");
                                                }
                                            }}
                                        >
                                            <Ionicons name="time-outline" size={14} color="#64748B" />
                                            <Text style={styles.recentChipText}>{user.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={{ color: '#94A3B8', fontSize: 12, fontStyle: 'italic' }}>No recent connections found.</Text>
                                )}
                            </ScrollView>

                        </View>

                        <View style={styles.participantsList}>
                            <View style={[styles.participantChip, styles.youChip]}>
                                <Ionicons name="person-circle" size={18} color="#FFFFFF" />
                                <Text style={[styles.participantText, { color: '#FFFFFF' }]}>You</Text>
                            </View>

                            {participants.map((p, index) => (
                                <View key={index} style={styles.participantChip}>
                                    <Ionicons name="person-circle" size={18} color="#64748B" />
                                    <Text style={styles.participantText}>{p.name}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveParticipant(index)} style={{ marginLeft: 4 }}>
                                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Total Amount Section */}
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total amount for this promise:</Text>
                        <Text style={styles.totalValue}>₹ {totalAmount || 0}</Text>
                    </View>

                    {/* Footer Reassurance */}
                    <Text style={styles.reassuranceText}>You can edit or cancel this later.</Text>

                    {/* Create Button */}
                    <TouchableOpacity
                        onPress={handleCreatePromise}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {/* Check if form is roughly valid to show gradient vs grey */}
                        {(title && duration && numPeople && amountPerPerson) ? (
                            <LinearGradient
                                colors={['#4F46E5', '#4338ca']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.createButton}
                            >
                                <Text style={styles.createButtonText}>
                                    {loading ? 'Creating...' : `Create Promise (₹${totalAmount})`}
                                </Text>
                            </LinearGradient>
                        ) : (
                            <View style={[styles.createButton, { backgroundColor: '#E2E8F0', shadowOpacity: 0 }]}>
                                <Text style={[styles.createButtonText, { color: '#94A3B8' }]}>
                                    Create Promise
                                </Text>
                            </View>
                        )}

                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    titleContainer: {
        marginBottom: 32,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    quoteText: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 4,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    // Sections
    sectionContainer: {
        marginBottom: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
    },
    formGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    helperText: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
    },
    helperTextBottom: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#0F172A',
    },
    participantInputsWrapper: {
        flexDirection: 'column',
        gap: 12,
    },
    participantNameInput: {
        flex: 1,
        marginBottom: 0,
    },
    participantNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    // Formula
    formulaContainer: {
        backgroundColor: '#F0F9FF',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        alignItems: 'center',
    },
    formulaText: {
        fontSize: 14,
        color: '#0369A1',
        fontWeight: '500',
    },
    formulaTotal: {
        fontWeight: '800',
        color: '#0284C7',
    },
    // Participants
    addParticipantRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E7FF',
        gap: 6,
    },
    disabledAddButton: {
        backgroundColor: '#F8FAFC',
        borderColor: '#F1F5F9',
    },
    addButtonText: {
        color: '#4338ca',
        fontWeight: '600',
        fontSize: 14,
    },
    // Recent Chips
    recentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    recentChipText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
    },
    participantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    participantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        marginBottom: 4,
    },
    youChip: {
        backgroundColor: '#4338ca',
    },
    participantText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
        marginLeft: 4,
    },
    removeButton: {
        marginLeft: 6,
    },
    totalSection: {
        backgroundColor: '#F1F5F9',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    totalLabel: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    // Footer
    reassuranceText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 13,
        marginBottom: 12,
    },
    createButton: {
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
