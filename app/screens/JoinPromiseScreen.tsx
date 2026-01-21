import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function JoinPromiseScreen() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const handleJoin = async () => {
        if (!code || code.length < 6) {
            Alert.alert('Invalid Code', 'Please enter a valid 6-character invite code.', [{ text: 'OK' }]);
            return;
        }

        setLoading(true);
        Keyboard.dismiss();

        try {
            // 1. Find Promise by Invite Code
            const { data: promise, error: fetchError } = await supabase
                .from('promises')
                .select('id, title, number_of_people')
                .eq('invite_code', code.toUpperCase())
                .single();

            if (fetchError || !promise) {
                Alert.alert('Not Found', 'No promise found with this code. Please check and try again.');
                setLoading(false);
                return;
            }

            // 2. Alert Confirmation (The "Review" Step)
            Alert.alert(
                'Join Promise?',
                `Do you want to join "${promise.title}" with other participants?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => setLoading(false)
                    },
                    {
                        text: 'Join Now',
                        style: 'default',
                        onPress: async () => {
                            try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) {
                                    setLoading(false);
                                    return;
                                }

                                const { error: joinError } = await supabase
                                    .from('promise_participants')
                                    .insert({
                                        promise_id: promise.id,
                                        user_id: user.id
                                    });

                                if (joinError) {
                                    if (joinError.code === '23505') { // Unique violation
                                        Alert.alert('Already Joined', 'You are already a participant in this promise.');
                                    } else {
                                        Alert.alert('Error', 'Failed to join promise.');
                                        console.error(joinError);
                                    }
                                } else {
                                    Alert.alert(
                                        'Success!',
                                        `You have successfully joined "${promise.title}".`,
                                        [{ text: 'Let\'s Go', onPress: () => router.navigate('/screens/HomeScreen') }]
                                    );
                                }
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'An unexpected error occurred.');
            setLoading(false);
        }
    };

    const handleScan = () => {
        if (!permission) {
            // Permission logic not yet loaded
            return;
        }
        if (!permission.granted) {
            requestPermission().then((res) => {
                if (res.granted) {
                    setIsScanning(true);
                } else {
                    Alert.alert('Camera Permission', 'We need camera permission to scan QR codes.');
                }
            });
        } else {
            setIsScanning(true);
        }
    };

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        setIsScanning(false);
        // Assuming the QR code contains JUST the invite code or a deep link like "paypromise://invite/CODE"
        // For robustness, let's extract the last 6 chars if it looks like a URL, or take it as is.
        let extracted = data.trim().toUpperCase();

        // Simple heuristic: if len > 6, try to split by '/' or just take last 6? 
        // Or user just scans the code text itself. 
        // Let's assume the QR is the code itself for now as per "read qr" requirement.
        // We can strip spaces.
        extracted = extracted.replace(/[^A-Z0-9]/g, '');

        if (extracted.length >= 6) {
            // Take last 6 just in case
            extracted = extracted.slice(-6);
            setCode(extracted);
            // Verify automatically? User said "see the screens after reading".
            // Let's trigger join immediately?
            // Or better, let the effect of setting code invite user to click?
            // The user asked "make sure evrything will works perfectly fine... see the screens".
            // Triggering join feels "perfect".
            // But we can't call handleJoin directly here easily due to state closure on empty 'code'.
            // We'd need to pass the code to handleJoin.
            // Let's just setCode and show a toast/alert or auto-trigger? 
            // Auto-triggering is risky nicely. I'll setCode and let them click "Review & Join" or I can add a useEffect.
            // Actually, I'll allow them to review.
            Alert.alert("QR Code Detected", `Found code: ${extracted}`, [
                { text: "Use Code", onPress: () => { } } // It's already set
            ]);
        } else {
            Alert.alert("Invalid QR", "Could not find a valid 6-character code.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#334155" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.title}>Join a Promise</Text>
                        <Text style={styles.subtitle}>Scan a QR code or enter invite code.</Text>

                        <View style={styles.form}>
                            <View style={styles.trustHeader}>
                                <Ionicons name="shield-checkmark-outline" size={16} color="#4338ca" />
                                <Text style={styles.trustHeaderText}>You’ll see all details before confirming.</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleScan}
                                style={styles.scanButton}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="qr-code-outline" size={24} color="#4F46E5" />
                                <Text style={styles.scanButtonText}>Scan QR Code</Text>
                            </TouchableOpacity>

                            <View style={styles.orDivider}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

                            <Text style={styles.label}>Invite Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-char code"
                                placeholderTextColor="#94A3B8"
                                value={code}
                                onChangeText={(text) => {
                                    // Auto uppercase and remove spaces
                                    const cleaned = text.toUpperCase().replace(/\s/g, '');
                                    if (cleaned.length <= 6) {
                                        setCode(cleaned);
                                    }
                                }}
                                autoCapitalize="characters"
                                maxLength={6}
                                autoCorrect={false}
                            />

                            <TouchableOpacity
                                onPress={handleJoin}
                                disabled={loading || code.length < 6}
                                activeOpacity={0.8}
                            >
                                {(code.length === 6 && !loading) ? (
                                    <LinearGradient
                                        colors={['#4F46E5', '#4338ca']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.joinButton}
                                    >
                                        <Text style={styles.joinButtonText}>Review & Join</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.joinButton, styles.disabledButton]}>
                                        {loading ? (
                                            <ActivityIndicator color="#94A3B8" />
                                        ) : (
                                            <Text style={styles.joinButtonTextDisabled}>Join Promise</Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.nextStepHint}>You’ll review the promise details before joining.</Text>
                        </View>

                        {/* Motivational Footer */}
                        <View style={styles.footerContainer}>
                            <View style={styles.iconGroup}>
                                <Ionicons name="people-circle" size={40} color="#CBD5E1" style={{ marginRight: -12 }} />
                                <Ionicons name="people-circle" size={40} color="#94A3B8" style={{ zIndex: 1 }} />
                                <Ionicons name="people-circle" size={40} color="#CBD5E1" style={{ marginLeft: -12 }} />
                            </View>
                            <Text style={styles.footerText}>Join your friends and stay accountable together.</Text>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Camera Modal */}
            <Modal visible={isScanning} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    >
                        <View style={styles.cameraOverlay}>
                            <View style={styles.cameraHeader}>
                                <TouchableOpacity onPress={() => setIsScanning(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={28} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={styles.cameraTitle}>Scan an Invite QR</Text>
                                <View style={{ width: 28 }} />
                            </View>

                            <View style={styles.scanFrameContainer}>
                                <View style={styles.scanFrame} />
                                <Text style={styles.scanFrameText}>Align QR code within the frame</Text>
                            </View>
                        </View>
                    </CameraView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 80 : 60,
    },
    header: {
        marginBottom: 20,
        alignItems: 'flex-start', // Align back button to left
    },
    backButton: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 32,
        lineHeight: 24,
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    trustHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#EEF2FF',
        padding: 10,
        borderRadius: 12,
        gap: 6,
    },
    trustHeaderText: {
        fontSize: 12,
        color: '#4338ca',
        fontWeight: '600',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    scanButtonText: {
        marginLeft: 8,
        color: '#4F46E5',
        fontSize: 16,
        fontWeight: '700',
    },
    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    orText: {
        marginHorizontal: 12,
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 20,
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        letterSpacing: 6,
    },
    helperText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 20,
    },
    joinButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
        width: '100%',
    },
    disabledButton: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    joinButtonTextDisabled: {
        color: '#94A3B8',
        fontSize: 18,
        fontWeight: '700',
    },
    nextStepHint: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 16,
    },
    // Footer
    footerContainer: {
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGroup: {
        flexDirection: 'row',
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    // Camera Styles
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'space-between',
    },
    cameraHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    closeButton: {
        padding: 8,
    },
    cameraTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    scanFrameContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 100,
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#FFF',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    scanFrameText: {
        color: '#FFF',
        marginTop: 20,
        fontSize: 14,
        opacity: 0.8,
    }
});
