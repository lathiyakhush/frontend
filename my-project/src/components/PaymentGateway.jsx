import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
    FiCreditCard,
    FiSmartphone,
    FiDollarSign,
    FiX,
    FiCheck,
    FiAlertCircle,
    FiRefreshCw,
} from 'react-icons/fi';

const PaymentGateway = ({
    amount,
    orderId,
    customerInfo,
    onPaymentSuccess,
    onPaymentFailure,
    onCancel
}) => {
    const location = useLocation();
    const navigate = useNavigate();

    const resolved = useMemo(() => {
        const state = (location && location.state) ? location.state : {};
        const resolvedAmount = Number(amount ?? state.amount ?? state.totalAmount ?? state.total ?? 0) || 0;
        const resolvedOrderId = String(orderId ?? state.orderId ?? state.order?.id ?? state.order?._id ?? '') || '';
        const resolvedCustomerInfo = customerInfo ?? state.customerInfo ?? state.customer ?? null;
        return {
            amount: resolvedAmount,
            orderId: resolvedOrderId,
            customerInfo: resolvedCustomerInfo,
        };
    }, [amount, orderId, customerInfo, location]);

    const safeOnPaymentSuccess = typeof onPaymentSuccess === 'function'
        ? onPaymentSuccess
        : (result) => {
            const state = (location && location.state) ? location.state : {};
            navigate('/summary', {
                replace: true,
                state: {
                    ...state,
                    paymentResult: result,
                }
            });
        };
    const safeOnPaymentFailure = typeof onPaymentFailure === 'function' ? onPaymentFailure : () => {};
    const safeOnCancel = typeof onCancel === 'function' ? onCancel : () => navigate(-1);

    const [selectedMethod, setSelectedMethod] = useState('');
    const [upiId, setUpiId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('idle');
    const [paymentError, setPaymentError] = useState('');
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);

    // Load Razorpay script on mount
    useEffect(() => {
        if (!window.Razorpay) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => setRazorpayLoaded(true);
            script.onerror = () => setRazorpayLoaded(false);
            document.body.appendChild(script);
        } else {
            setRazorpayLoaded(true);
        }
    }, []);

    const paymentMethods = [
        {
            id: 'phonepe',
            name: 'PhonePe',
            icon: <FiSmartphone className="w-6 h-6" />,
            badgeClass: 'bg-purple-100 text-purple-700',
            description: 'Pay using PhonePe UPI'
        },
        {
            id: 'paytm',
            name: 'Paytm',
            icon: <FiDollarSign className="w-6 h-6" />,
            badgeClass: 'bg-sky-100 text-sky-700',
            description: 'Pay using Paytm Wallet or UPI'
        },
        {
            id: 'googlepay',
            name: 'Google Pay',
            icon: <FiCreditCard className="w-6 h-6" />,
            badgeClass: 'bg-emerald-100 text-emerald-700',
            description: 'Pay using Google Pay UPI'
        },
        {
            id: 'upi',
            name: 'UPI',
            icon: <FiSmartphone className="w-6 h-6" />,
            badgeClass: 'bg-orange-100 text-orange-700',
            description: 'Pay using any UPI app'
        }
    ];

    const handlePayment = async () => {
        if (!selectedMethod || (selectedMethod === 'upi' && !upiId.trim())) {
            return;
        }

        if (!resolved.amount) {
            setPaymentStatus('failed');
            setPaymentError('Missing amount. Please go back and try again.');
            return;
        }

        if (!razorpayLoaded || !window.Razorpay) {
            setPaymentError('Payment system not loaded. Please try again.');
            return;
        }

        setIsProcessing(true);
        setPaymentStatus('processing');

        try {
            const state = (location && location.state) ? location.state : {};

            const normalizedItems = Array.isArray(state.items)
                ? state.items
                    .map((it) => {
                        const p = it?.product || {};
                        const productId = it?.productId || p?._id || it?.product || it?._id;
                        const name = it?.name || p?.name;
                        const price = Number(it?.price ?? p?.price ?? 0) || 0;
                        const quantity = Number(it?.quantity ?? 0) || 0;
                        if (!productId || !name || !price || !quantity) return null;
                        return {
                            productId: String(productId),
                            name: String(name),
                            price,
                            quantity,
                            size: it?.size || it?.selectedSize,
                            color: it?.color || it?.selectedColor,
                        };
                    })
                    .filter(Boolean)
                : [];

            const orderData = {
                currency: 'INR',
                subtotal: Number(state.subtotal ?? 0) || 0,
                shipping: Number(state.shipping ?? 0) || 0,
                tax: Number(state.tax ?? 0) || 0,
                codCharge: Number(state.codCharge ?? 0) || 0,
                total: Number(state.total ?? resolved.amount ?? 0) || 0,
                paymentMethod: selectedMethod,
                items: normalizedItems,
                customer: state.customer ?? resolved.customerInfo ?? null,
                address: state.address ?? null,
            };

            const amountRupees = Math.round(Number(resolved.amount ?? orderData.total ?? 0) || 0);

            // Create order on backend
            const resp = await apiClient.post('/payments/create-order', {
                amount: amountRupees,
                currency: 'INR',
                provider: 'razorpay',
                orderData,
            });

            const data = resp?.data;
            const razorpayOrderId = data?.razorpayOrderId;
            const razorpayKeyId = data?.razorpayKeyId;

            if (!razorpayOrderId || !razorpayKeyId) {
                throw new Error(data?.message || data?.error || 'Failed to create order');
            }

            // Save payment info
            try {
                localStorage.setItem('lastPaymentId', String(data?.paymentId || ''));
                localStorage.setItem('lastOrderId', String(data?.orderId || ''));
                localStorage.setItem('ikolyra_lastOrderData', JSON.stringify(orderData));
            } catch (_e) {
                // ignore
            }

            const customer = orderData.customer;

            // Configure Razorpay options
            const options = {
                key: razorpayKeyId,
                amount: amountRupees * 100,
                currency: 'INR',
                name: 'Ikolyra',
                description: `${selectedMethod.toUpperCase()} Payment`,
                order_id: razorpayOrderId,
                prefill: {
                    name: customer?.name || '',
                    email: customer?.email || '',
                    contact: customer?.phone || '',
                    method: selectedMethod === 'upi' ? 'upi' : selectedMethod === 'paytm' ? 'paytm' : 'upi',
                    vpa: selectedMethod === 'upi' ? upiId : undefined,
                },
                theme: {
                    color: '#5A0B5A',
                },
                config: {
                    display: {
                        blocks: {
                            upi: {
                                name: 'UPI',
                                instruments: [{ method: 'upi' }]
                            },
                            cards: {
                                name: 'Cards',
                                instruments: [{ method: 'card' }]
                            },
                            netbanking: {
                                name: 'Net Banking',
                                instruments: [{ method: 'netbanking' }]
                            },
                            wallet: {
                                name: 'Wallet',
                                instruments: [{ method: 'wallet' }]
                            }
                        },
                        sequence: ['block.upi', 'block.cards', 'block.netbanking', 'block.wallet'],
                        preferences: {
                            show_default_blocks: true
                        }
                    }
                },
                modal: {
                    ondismiss: function() {
                        setIsProcessing(false);
                        setPaymentStatus('idle');
                        safeOnPaymentFailure('Payment cancelled by user');
                    }
                },
                handler: async function (response) {
                    // Payment success
                    try {
                        const verifyResp = await apiClient.post('/payments/verify', {
                            paymentId: data?.paymentId,
                            status: 'completed',
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            orderData,
                        });

                        const verifyData = verifyResp?.data;
                        setPaymentStatus('completed');
                        safeOnPaymentSuccess({
                            orderId: verifyData?.orderId,
                            orderNumber: verifyData?.orderNumber,
                            paymentId: verifyData?.paymentId,
                            status: verifyData?.status,
                        });
                    } catch (verifyError) {
                        console.error('Verification error:', verifyError);
                        setPaymentStatus('failed');
                        setPaymentError('Payment successful but verification failed. Please contact support.');
                        safeOnPaymentFailure('Verification failed');
                    }
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                setPaymentStatus('failed');
                setPaymentError('Payment failed: ' + (response.error?.description || 'Unknown error'));
                safeOnPaymentFailure('Payment failed');
            });
            rzp.open();

        } catch (error) {
            console.error('Payment error:', error);
            setPaymentStatus('failed');
            const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Payment failed';
            setPaymentError(String(msg));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRetry = () => {
        setPaymentStatus('idle');
        setPaymentError('');
    };

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 space-y-4 pb-24 sm:pb-0">
            <div className="sm:hidden flex items-center justify-between mb-2">
                <button
                    type="button"
                    onClick={safeOnCancel}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200"
                >
                    <FiX className="text-gray-700" />
                </button>
                <div className="text-[18px] font-bold text-gray-900">Payment</div>
                <div className="w-10" />
            </div>

            <div className="sm:hidden mb-3">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-600 text-white">
                                <FiCheck className="w-4 h-4" />
                            </div>
                            <span className="font-semibold">Cart</span>
                        </div>
                        <div className="flex-1 h-[2px] mx-1.5 bg-emerald-200" />
                        <div className="flex items-center gap-1.5 text-emerald-600">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-600 text-white">
                                <FiCheck className="w-4 h-4" />
                            </div>
                            <span className="font-semibold">Address</span>
                        </div>
                        <div className="flex-1 h-[2px] mx-1.5 bg-gray-200" />
                        <div className="flex items-center gap-1.5 text-[#5A0B5A]">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#5A0B5A] text-white">3</div>
                            <span className="font-semibold">Payment</span>
                        </div>
                        <div className="flex-1 h-[2px] mx-1.5 bg-gray-200" />
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-200">4</div>
                            <span className="font-semibold">Summary</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="sm:hidden bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <FiCheck className="text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-[13px] font-bold text-gray-900">100% SAFE PAYMENTS</div>
                            <div className="text-[12px] text-gray-600">Razorpay Secure Payment Gateway</div>
                        </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Verified</span>
                </div>
            </div>

            <div className="hidden sm:block bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Payment</div>
                        <div className="text-xs text-gray-500 mt-0.5">Order {resolved.orderId ? `#${resolved.orderId}` : ''}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">Amount</div>
                        <div className="text-lg font-extrabold text-gray-900">₹{Number(resolved.amount || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={safeOnCancel}
                        className="text-sm font-semibold text-gray-700 hover:text-gray-900"
                    >
                        Cancel
                    </button>
                    <div className="text-xs text-gray-500">Secure payment</div>
                </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <h3 className="text-base font-extrabold text-gray-900">Choose Payment Method</h3>
                <div className="mt-3 space-y-3">
                    {paymentMethods.map((method) => {
                        const active = selectedMethod === method.id;
                        return (
                            <button
                                key={method.id}
                                type="button"
                                onClick={() => setSelectedMethod(method.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition ${active ? 'border-[#5A0B5A] bg-[#F5EAF4]' : 'border-gray-200 bg-white'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${active ? 'border-[#5A0B5A] bg-[#5A0B5A]' : 'border-gray-300 bg-white'}`}>
                                    <div className={`w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-transparent'}`} />
                                </div>
                                <div className={`w-10 h-10 rounded-xl ${method.badgeClass} flex items-center justify-center`}>{method.icon}</div>
                                <div className="flex-1 text-left">
                                    <div className="text-[14px] font-semibold text-gray-900">{method.name}</div>
                                </div>
                                <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">UPI</span>
                            </button>
                        );
                    })}
                </div>

                {/* UPI ID Input for UPI method */}
                {selectedMethod === 'upi' && (
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            UPI ID
                        </label>
                        <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="Enter your UPI ID (e.g., username@ybl)"
                            className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                        />
                    </div>
                )}

                {/* Error Display */}
                {paymentError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2">
                            <FiAlertCircle className="w-5 h-5 text-red-600" />
                            <p className="text-sm text-red-700">{paymentError}</p>
                        </div>
                    </div>
                )}

                {/* Status Display */}
                {paymentStatus === 'processing' && (
                    <div className="mt-4 flex items-center justify-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#5A0B5A] border-t-transparent"></div>
                        <span className="text-sm text-gray-600">Processing...</span>
                    </div>
                )}

                {paymentStatus === 'failed' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2">
                            <FiAlertCircle className="w-5 h-5 text-red-600" />
                            <p className="text-sm text-red-700">Payment failed. Please try again.</p>
                        </div>
                        <button
                            onClick={handleRetry}
                            className="mt-2 w-full bg-[#5A0B5A] hover:bg-[#4a094a] text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={!selectedMethod || (selectedMethod === 'upi' && !upiId.trim()) || isProcessing}
                    className="hidden sm:flex w-full mt-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:cursor-not-allowed items-center justify-center"
                >
                    {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Processing...
                        </div>
                    ) : (
                        `Pay ₹${Number(resolved.amount || 0).toLocaleString()}`
                    )}
                </button>
            </div>

            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[16px] font-extrabold text-[#5A0B5A] truncate">₹{Number(resolved.amount || 0).toFixed(2)}</div>
                        <div className="text-[12px] text-gray-500">Inclusive of all taxes</div>
                    </div>
                    <button
                        type="button"
                        onClick={handlePayment}
                        disabled={!selectedMethod || (selectedMethod === 'upi' && !upiId.trim()) || isProcessing}
                        className="h-12 px-6 inline-flex items-center justify-center rounded-xl bg-[#A78C9E] disabled:bg-gray-200 text-white text-sm font-extrabold shadow-sm flex-1"
                    >
                        {isProcessing ? 'Processing...' : `Pay ₹${Number(resolved.amount || 0).toFixed(2)}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentGateway;
