import { Ionicons } from '@expo/vector-icons';
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
        if (!participantNumber.trim()) {
            Alert.alert('Missing Number', 'Please enter a mobile number.');
            return;
        }

        // Check limit
        if (totalSlots > 0 && invitesAdded >= maxInvites) {
            Alert.alert('Limit Reached', `You + ${maxInvites} others = ${totalSlots} people.`);
            return;
        }

        if (participants.some(p => p.number === participantNumber.trim())) {
            Alert.alert('Duplicate', 'This number is already added.');
            return;
        }

        setParticipants([...participants, { name: participantName.trim(), number: participantNumber.trim() }]);
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

            // Prepare Data
            const finalParticipants = [
                { name: 'You', number: 'User' },
                ...participants
            ];

            const { error } = await supabase.from('promises').insert({
                title,
                duration_days: parseInt(duration),
                number_of_people: parseInt(numPeople),
                amount_per_person: parseInt(amountPerPerson),
                total_amount: totalAmount,
                participants: finalParticipants,
                created_by: user.id,
                status: 'active'
            });

            if (error) {
                console.error('Supabase Insert Error:', error);
                Alert.alert('Error', 'Failed to save promise. Please try again.');
            } else {
                // Success
                Alert.alert('Success', 'Promise created successfully!');
                router.navigate('/screens/HomeScreen');
            }

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
                        <Text style={styles.quoteText}>“A promise means nothing until there is a cost.”</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Morning Jog"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                            <Text style={styles.label}>Duration (Days) <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                placeholder="7"
                                value={duration}
                                onChangeText={setDuration}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>No. of People <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                placeholder="3"
                                value={numPeople}
                                onChangeText={setNumPeople}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Amount per Person (₹) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="200"
                            value={amountPerPerson}
                            onChangeText={setAmountPerPerson}
                            keyboardType="numeric"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    {/* Participants Section */}
                    <View style={styles.formGroup}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.label}>Participants</Text>
                            {totalSlots > 0 && (
                                <Text style={styles.helperText}>
                                    {invitesAdded + 1} / {totalSlots} (Inc. You)
                                </Text>
                            )}
                        </View>

                        <View style={styles.participantInputsWrapper}>
                            <TextInput
                                style={[styles.input, styles.participantNameInput]}
                                placeholder="Name"
                                value={participantName}
                                onChangeText={setParticipantName}
                                placeholderTextColor="#94A3B8"
                                editable={invitesAdded < maxInvites}
                            />
                            <View style={styles.participantNumberContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    placeholder="Mobile Number"
                                    value={participantNumber}
                                    onChangeText={setParticipantNumber}
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#94A3B8"
                                    editable={invitesAdded < maxInvites}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.addButton,
                                        (invitesAdded >= maxInvites && totalSlots > 0) && styles.disabledButton
                                    ]}
                                    onPress={handleAddParticipant}
                                    disabled={invitesAdded >= maxInvites && totalSlots > 0}
                                >
                                    <Ionicons name="add" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {totalSlots > 0 && invitesAdded < maxInvites && (
                            <Text style={styles.helperTextBottom}>
                                Adding {invitesAdded} of {maxInvites} friends.
                            </Text>
                        )}

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

                    {/* Create Button */}
                    <TouchableOpacity
                        style={[styles.createButton, { opacity: (totalAmount > 0 && !loading) ? 1 : 0.7 }]}
                        onPress={handleCreatePromise}
                        disabled={totalAmount <= 0 || loading}
                    >
                        <Text style={styles.createButtonText}>
                            {loading ? 'Creating...' : 'Create Promise'}
                        </Text>
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
        fontStyle: 'italic',
        color: '#64748B',
        lineHeight: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    helperText: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 8,
    },
    helperTextBottom: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
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
    addButton: {
        backgroundColor: '#0F172A',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#94A3B8',
    },
    participantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
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
        gap: 6
    },
    youChip: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    participantText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
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
    createButton: {
        backgroundColor: '#0F172A',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
