import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
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
    View
} from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

export default function JoinPromiseScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const handleJoin = async () => {
        if (!code || code.length < 6) {
            showAlert({
                title: 'Invalid Code',
                message: 'Please enter a valid 6-character invite code.',
                type: 'warning'
            });
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
                showAlert({
                    title: 'Not Found',
                    message: 'No promise found with this code. Please check and try again.',
                    type: 'error'
                });
                setLoading(false);
                return;
            }

            // 2. Alert Confirmation (The "Review" Step)
            showAlert({
                title: 'Join Promise?',
                message: `Do you want to join "${promise.title}" with other participants?`,
                type: 'info',
                buttons: [
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
                                        showAlert({
                                            title: 'Already Joined',
                                            message: 'You are already a participant in this promise.',
                                            type: 'info'
                                        });
                                    } else {
                                        showAlert({
                                            title: 'Error',
                                            message: 'Failed to join promise.',
                                            type: 'error'
                                        });
                                        console.error(joinError);
                                    }
                                } else {
                                    showAlert({
                                        title: 'Success!',
                                        message: `You have successfully joined "${promise.title}".`,
                                        type: 'success',
                                        buttons: [
                                            {
                                                text: 'Let\'s Go',
                                                onPress: () => router.navigate('/screens/HomeScreen')
                                            }
                                        ]
                                    });
                                }
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            });

        } catch (e) {
            console.error(e);
            showAlert({
                title: 'Error',
                message: 'An unexpected error occurred.',
                type: 'error'
            });
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
                    showAlert({
                        title: 'Camera Permission',
                        message: 'We need camera permission to scan QR codes.',
                        type: 'warning'
                    });
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
            showAlert({
                title: "QR Code Detected",
                message: `Found code: ${extracted}`,
                type: "info",
                buttons: [
                    { text: "Use Code", onPress: () => { } } // It's already set
                ]
            });
        } else {
            showAlert({
                title: "Invalid QR",
                message: "Could not find a valid 6-character code.",
                type: "error"
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <GridOverlay />
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


                            {/* QR READER IMPLEMENTATION */}
                            {/* <TouchableOpacity
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
                            </View> */}

                            <Text style={styles.label}>Invite Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter code"
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
                            {/* <View style={styles.iconGroup}>
                                <Ionicons name="people-circle" size={40} color="#CBD5E1" style={{ marginRight: -12 }} />
                                <Ionicons name="people-circle" size={40} color="#94A3B8" style={{ zIndex: 1 }} />
                                <Ionicons name="people-circle" size={40} color="#CBD5E1" style={{ marginLeft: -12 }} />
                            </View> */}
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
        marginBottom: 32,
        alignItems: 'flex-start',
    },
    backButton: {
        width: 44,
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 18,
        color: '#64748B',
        marginBottom: 40,
        fontWeight: '500',
        lineHeight: 28,
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 8,
    },
    trustHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#EEF2FF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(79, 70, 229, 0.1)',
    },
    trustHeaderText: {
        fontSize: 13,
        color: '#4F46E5',
        fontWeight: '700',
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 20,
        fontSize: 28,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: 8,
    },
    joinButton: {
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        width: '100%',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    disabledButton: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowOpacity: 0,
        elevation: 0,
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    joinButtonTextDisabled: {
        color: '#94A3B8',
        fontSize: 18,
        fontWeight: '800',
    },
    nextStepHint: {
        textAlign: 'center',
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 20,
        fontWeight: '500',
    },
    // Footer
    footerContainer: {
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    footerText: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 24,
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
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    cameraTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    scanFrameContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 100,
    },
    scanFrame: {
        width: 280,
        height: 280,
        borderWidth: 2,
        borderColor: '#FFF',
        borderRadius: 30,
        backgroundColor: 'transparent',
    },
    scanFrameText: {
        color: '#FFF',
        marginTop: 24,
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.9,
    }
});
