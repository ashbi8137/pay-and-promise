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
import { scaleFont } from '../utils/layout';

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

                        <View style={styles.heroBlock}>
                            <Text style={styles.heroEyebrow} allowFontScaling={false}>EXPAND YOUR CIRCLE</Text>
                            <Text style={styles.heroTitle} allowFontScaling={false}>Join Promise</Text>
                            <View style={styles.heroDivider} />
                            <Text style={styles.heroSubtitle} allowFontScaling={false}>
                                Enter your invite code below
                            </Text>
                        </View>

                        <View style={styles.form}>



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

                            <TextInput
                                style={styles.input}
                                placeholder="Enter code"
                                placeholderTextColor="#94A3B8"
                                value={code}
                                allowFontScaling={false}
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
                                        colors={['#4F46E5', '#7C3AED']} // Matching HomeScreen Hero Gradient
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.joinButton}
                                    >
                                        <Text style={styles.joinButtonText} allowFontScaling={false}>Review & Join</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.joinButton, styles.disabledButton]}>
                                        {loading ? (
                                            <ActivityIndicator color="#94A3B8" />
                                        ) : (
                                            <Text style={styles.joinButtonTextDisabled} allowFontScaling={false}>Join Promise</Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>

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
        padding: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(80) : scaleFont(60),
    },
    header: {
        marginBottom: scaleFont(40),
        alignItems: 'flex-start',
    },
    backButton: {
        width: scaleFont(40),
        height: scaleFont(40),
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(12),
        borderWidth: scaleFont(1), // Strictly responsive
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(2) },
        shadowOpacity: 0.05,
        shadowRadius: scaleFont(4),
        elevation: scaleFont(2),
    },
    heroBlock: {
        marginBottom: scaleFont(40),
        alignItems: 'center',
    },
    heroEyebrow: {
        fontSize: scaleFont(12),
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: scaleFont(2),
        textTransform: 'uppercase',
        marginBottom: scaleFont(8),
        fontFamily: 'Outfit_700Bold',
    },
    heroTitle: {
        fontSize: scaleFont(36),
        fontWeight: '800',
        color: '#0F172A', // Theme Text
        marginBottom: scaleFont(16),
        letterSpacing: scaleFont(-1),
        fontFamily: 'Outfit_800ExtraBold',
        textAlign: 'center',
    },
    heroDivider: {
        width: scaleFont(40),
        height: scaleFont(4),
        backgroundColor: '#4F46E5', // Brand Accent
        borderRadius: scaleFont(2),
        marginBottom: scaleFont(16),
    },
    heroSubtitle: {
        fontSize: scaleFont(16),
        color: '#64748B',
        textAlign: 'center',
        lineHeight: scaleFont(24),
        fontFamily: 'Outfit_400Regular',
        maxWidth: '80%',
    },
    form: {
        // Removed heavy card look for a cleaner, open feel
    },
    label: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: '#475569',
        marginBottom: scaleFont(12),
        textTransform: 'uppercase',
        letterSpacing: scaleFont(1.5),
        fontFamily: 'Outfit_700Bold',
        marginLeft: scaleFont(4),
    },
    input: {
        backgroundColor: '#FFFFFF', // Fallback
        borderWidth: scaleFont(1),
        borderColor: '#E2E8F0',
        borderRadius: scaleFont(16),
        paddingVertical: scaleFont(18),
        paddingHorizontal: scaleFont(20),
        fontSize: scaleFont(24),
        fontWeight: '700',
        color: '#0F172A', // Theme Text Color
        textAlign: 'center',
        letterSpacing: scaleFont(4),
        marginBottom: scaleFont(32),
        fontFamily: 'Outfit_700Bold',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.05,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(2),
    },
    joinButton: {
        height: scaleFont(52),
        borderRadius: scaleFont(16),
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.2,
        shadowRadius: scaleFont(12),
        elevation: scaleFont(4),
    },
    disabledButton: {
        backgroundColor: '#F1F5F9',
        borderWidth: scaleFont(1), // Strictly responsive
        borderColor: '#E2E8F0',
        shadowOpacity: 0,
        elevation: 0,
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: scaleFont(16),
        fontWeight: '700',
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_700Bold',
    },
    joinButtonTextDisabled: {
        color: '#94A3B8',
        fontSize: scaleFont(16),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
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
        padding: scaleFont(20),
        paddingTop: Platform.OS === 'ios' ? scaleFont(60) : scaleFont(40),
    },
    closeButton: {
        width: scaleFont(44),
        height: scaleFont(44),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleFont(22),
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    cameraTitle: {
        color: '#FFF',
        fontSize: scaleFont(18),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    scanFrameContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleFont(100),
    },
    scanFrame: {
        width: scaleFont(280),
        height: scaleFont(280),
        borderWidth: scaleFont(2),
        borderColor: '#FFF',
        borderRadius: scaleFont(30),
        backgroundColor: 'transparent',
    },
    scanFrameText: {
        color: '#FFF',
        marginTop: scaleFont(24),
        fontSize: scaleFont(16),
        fontWeight: '600',
        opacity: 0.9,
        fontFamily: 'Outfit_400Regular',
    },
    // Feature Row
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleFont(60), // Push to bottom area
        gap: scaleFont(16),
    },
    featureItem: {
        alignItems: 'center',
        gap: scaleFont(8),
    },
    featureIconBox: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(14),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(2) },
        shadowOpacity: 0.03,
        shadowRadius: scaleFont(4),
        elevation: scaleFont(1),
    },
    featureLabel: {
        fontSize: scaleFont(10),
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_700Bold',
    },
    featureDivider: {
        width: 1,
        height: scaleFont(24),
        backgroundColor: '#E2E8F0',
        marginHorizontal: scaleFont(8),
    }
});
