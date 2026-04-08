import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const FALLBACK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const SummaryPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    const [paymentStatus, setPaymentStatus] = useState('unknown');
    const [paymentMessage, setPaymentMessage] = useState('');
    const [cartCleared, setCartCleared] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [fetchedOrder, setFetchedOrder] = useState(null); // Store order from backend

    const data = useMemo(() => {
        const state = (location && location.state) ? location.state : {};
        
        // If location.state is empty, try localStorage
        let items = Array.isArray(state.items) ? state.items : [];
        let subtotal = state.subtotal;
        let shipping = state.shipping;
        let tax = state.tax;
        let codCharge = state.codCharge;
        let total = state.total;
        let address = state.address;
        let customer = state.customer;
        let paymentMethod = state.paymentMethod;
        
        if (!items.length && !subtotal && !total) {
            try {
                const saved = localStorage.getItem('ikolyra_lastOrderData');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    items = Array.isArray(parsed?.items) ? parsed.items : [];
                    subtotal = parsed?.subtotal;
                    shipping = parsed?.shipping;
                    tax = parsed?.tax;
                    codCharge = parsed?.codCharge;
                    total = parsed?.total;
                    address = parsed?.address;
                    customer = parsed?.customer;
                    paymentMethod = parsed?.paymentMethod || 'razorpay';
                }
            } catch (_e) {
                // ignore
            }
        }
        
        const money = (v) => Math.round((Number(v ?? 0) || 0) * 100) / 100;
        const rupees = (v) => Math.round(Number(v ?? 0) || 0);

        const calculatedSubtotal = money(subtotal ?? items.reduce((sum, it) => {
            const qty = Number(it?.quantity ?? 0) || 0;
            const price = Number(it?.price ?? it?.product?.price ?? 0) || 0;
            return sum + price * qty;
        }, 0));

        const calculatedShipping = money(shipping ?? 0);
        const calculatedTax = money(tax ?? 0);
        const calculatedCodCharge = money(codCharge ?? 0);
        const calculatedTotal = rupees(total ?? (calculatedSubtotal + calculatedShipping + calculatedTax + calculatedCodCharge));

        return {
            orderId: String(state.orderId ?? state.id ?? '') || '',
            orderNumber: String(state.orderNumber ?? '') || '',
            items,
            subtotal: calculatedSubtotal,
            shipping: calculatedShipping,
            tax: calculatedTax,
            codCharge: calculatedCodCharge,
            total: calculatedTotal,
            address: address ?? null,
            customer: customer ?? null,
            paymentMethod: String(paymentMethod ?? '') || '',
        };
    }, [location]);

    useEffect(() => {
        const pm = String(data.paymentMethod || '').toLowerCase();
        if (pm === 'cod' || pm === 'razorpay') {
            // For COD and Razorpay, payment is already completed when we reach summary
            setPaymentStatus('completed');
            setPaymentMessage(pm === 'cod' ? 'Order placed with Cash on Delivery.' : 'Payment successful!');
            return;
        }
        // For any other payment methods, show unknown status
        setPaymentStatus('unknown');
        setPaymentMessage('Unable to determine payment status.');
    }, [data.paymentMethod, data.orderId, data.orderNumber]);

    useEffect(() => {
        if (paymentStatus !== 'completed') return;
        if (cartCleared) return;

        let mode = 'cart';
        try {
            mode = String(localStorage.getItem('ikolyra_last_checkout_mode') || 'cart').toLowerCase();
        } catch (_e) {
            mode = 'cart';
        }

        if (mode !== 'cart') {
            setCartCleared(true);
            return;
        }

        void (async () => {
            try {
                await clearCart();
            } catch (_e) {
                // ignore
            } finally {
                setCartCleared(true);
                try {
                    localStorage.removeItem('ikolyra_last_checkout_mode');
                    localStorage.removeItem('lastPaymentProviderOrderId');
                    localStorage.removeItem('lastPaymentId');
                    localStorage.removeItem('lastOrderId');
                    localStorage.removeItem('ikolyra_lastOrderData'); // Clean up order data
                } catch (_e2) {
                    // ignore
                }
            }
        })();
    }, [paymentStatus, cartCleared, clearCart]);

    return (
        <div className="relative min-h-screen bg-[#F1F3F6]">
            <div className="pt-32 sm:pt-36 pb-8 px-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-3 sm:mb-6">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center text-[13px] sm:text-sm text-gray-600 hover:text-[#2874F0]"
                    >
                        <FaArrowLeft className="mr-2" />
                        Back
                    </button>
                    <h1 className="text-[18px] sm:text-[24px] font-bold text-gray-900">Summary</h1>
                    <div className="w-10" />
                </div>

                <div className="mb-3 sm:mb-6 overflow-x-auto">
                    <div className="bg-white border border-gray-200 rounded-lg px-2 sm:px-4 py-2.5 min-w-[320px]">
                        <div className="flex items-center justify-between text-[9px] sm:text-[13px] whitespace-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2 text-emerald-600">
                                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold bg-emerald-600 text-white">1</div>
                                <span className="font-semibold">Cart</span>
                            </div>
                            <div className="flex-1 h-[2px] mx-1 sm:mx-4 bg-emerald-200 min-w-[20px]" />
                            <div className="flex items-center gap-1 sm:gap-2 text-emerald-600">
                                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold bg-emerald-600 text-white">2</div>
                                <span className="font-semibold">Address</span>
                            </div>
                            <div className="flex-1 h-[2px] mx-1 sm:mx-4 bg-emerald-200 min-w-[20px]" />
                            <div className="flex items-center gap-1 sm:gap-2 text-emerald-600">
                                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold bg-emerald-600 text-white">3</div>
                                <span className="font-semibold">Payment</span>
                            </div>
                            <div className="flex-1 h-[2px] mx-1 sm:mx-4 bg-gray-200 min-w-[20px]" />
                            <div className="flex items-center gap-1 sm:gap-2 text-[#5A0B5A]">
                                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold bg-[#5A0B5A] text-white">4</div>
                                <span className="font-semibold">Summary</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 min-w-0">
                    <div className="lg:col-span-2 min-w-0 space-y-3">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            {paymentStatus === 'completed' ? (
                                <>
                                    <div className="text-sm font-semibold text-gray-900">Order placed</div>
                                    {(createdOrder?.orderNumber || fetchedOrder?.orderNumber || data.orderNumber) ? (
                                        <div className="text-xs text-gray-500 mt-1">Order #: <span className="font-mono">{createdOrder?.orderNumber || fetchedOrder?.orderNumber || data.orderNumber}</span></div>
                                    ) : (createdOrder?.orderId || fetchedOrder?._id || data.orderId) ? (
                                        <div className="text-xs text-gray-500 mt-1">Order ID: <span className="font-mono">{createdOrder?.orderId || fetchedOrder?._id || data.orderId}</span></div>
                                    ) : null}
                                    {(fetchedOrder?.paymentMethod || data.paymentMethod) ? (
                                        <div className="text-xs text-gray-500 mt-1">Payment: {(fetchedOrder?.paymentMethod || data.paymentMethod).toUpperCase()}</div>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    <div className="text-sm font-semibold text-gray-900">Payment status unknown</div>
                                    <div className="text-xs text-gray-600 mt-1">{paymentMessage || 'Please check your orders page for order status.'}</div>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/orders')}
                                            className="h-9 px-3 inline-flex items-center justify-center rounded-md bg-[#5A0B5A] text-white text-xs font-semibold"
                                        >
                                            View Orders
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/checkout')}
                                            className="h-9 px-3 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-900 text-xs font-semibold"
                                        >
                                            Back to Checkout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {(fetchedOrder?.address || data.address) ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="text-sm font-semibold text-gray-900 mb-2">Delivery Address</div>
                                <div className="text-[13px] text-gray-700 leading-5">
                                    {(fetchedOrder?.customer?.name || data.customer?.name) ? (<div className="font-semibold">{fetchedOrder?.customer?.name || data.customer?.name}</div>) : null}
                                    {(fetchedOrder?.customer?.phone || data.customer?.phone) ? (<div className="text-gray-600">{fetchedOrder?.customer?.phone || data.customer?.phone}</div>) : null}
                                    <div className="mt-1">
                                        {(fetchedOrder?.address?.line1 || data.address?.line1) || ''}{(fetchedOrder?.address?.line2 || data.address?.line2) ? `, ${fetchedOrder?.address?.line2 || data.address?.line2}` : ''}
                                    </div>
                                    <div>
                                        {(fetchedOrder?.address?.city || data.address?.city) || ''}{(fetchedOrder?.address?.state || data.address?.state) ? `, ${fetchedOrder?.address?.state || data.address?.state}` : ''}{(fetchedOrder?.address?.postalCode || data.address?.postalCode) ? ` - ${fetchedOrder?.address?.postalCode || data.address?.postalCode}` : ''}
                                    </div>
                                    {(fetchedOrder?.address?.country || data.address?.country) ? (<div>{fetchedOrder?.address?.country || data.address?.country}</div>) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-semibold text-gray-900 mb-3">Items</div>
                            <div className="space-y-3">
                                {(fetchedOrder?.items || data.items).map((item, idx) => {
                                    const pid = item?.product?._id || item?.productId || item?._id || item?.product || idx;
                                    const name = item?.product?.name || item?.name || '';
                                    const image = item?.image || item?.selectedImage || item?.product?.image || item?.product?.galleryImages?.[0] || FALLBACK_IMAGE;
                                    const qty = Number(item?.quantity ?? 0) || 0;
                                    const price = Number(item?.price ?? item?.product?.price ?? 0) || 0;
                                    return (
                                        <div key={`${pid}-${item?.size || ''}-${item?.color || ''}-${idx}`} className="flex gap-3">
                                            <img
                                                src={image}
                                                alt={name}
                                                className="w-14 h-14 rounded-md border border-gray-200 object-contain bg-white"
                                                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-semibold text-gray-900 truncate">{name}</div>
                                                {(item?.selectedSize || item?.selectedColor || item?.size || item?.color) ? (
                                                    <div className="text-[12px] text-gray-500 mt-0.5">
                                                        {(item?.selectedSize || item?.size) ? `Size: ${item.selectedSize || item.size}` : ''}
                                                        {(item?.selectedSize || item?.size) && (item?.selectedColor || item?.color) ? ' | ' : ''}
                                                        {(item?.selectedColor || item?.color) ? `Color: ${item.selectedColor || item.color}` : ''}
                                                    </div>
                                                ) : null}
                                                <div className="text-[12px] text-gray-600 mt-0.5">Qty: {qty}</div>
                                            </div>
                                            <div className="text-[13px] font-semibold text-gray-900">₹{(price * qty).toFixed(0)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {paymentStatus === 'completed' ? (
                                <Link
                                    to="/orders"
                                    className="flex-1 h-11 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-semibold"
                                >
                                    View Orders
                                </Link>
                            ) : (
                                <Link
                                    to="/cart"
                                    className="flex-1 h-11 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-semibold"
                                >
                                    Back to Cart
                                </Link>
                            )}
                            <Link
                                to="/"
                                className="flex-1 h-11 inline-flex items-center justify-center rounded-lg bg-[#5A0B5A] text-white text-sm font-semibold"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:sticky lg:top-4">
                            <div className="text-sm font-semibold text-gray-900 mb-3">Price Details</div>
                            <div className="space-y-2 text-[13px]">
                                <div className="flex justify-between text-gray-700"><span>Subtotal</span><span className="font-semibold">₹{Number((fetchedOrder?.subtotal || data.subtotal) || 0).toFixed(0)}</span></div>
                                <div className="flex justify-between text-gray-700"><span>Tax</span><span className="font-semibold">₹{Number((fetchedOrder?.tax || data.tax) || 0).toFixed(0)}</span></div>
                                <div className="flex justify-between text-gray-700"><span>Shipping</span><span className="font-semibold">{Number((fetchedOrder?.shipping || data.shipping) || 0) === 0 ? 'FREE' : `₹${Number((fetchedOrder?.shipping || data.shipping) || 0).toFixed(0)}`}</span></div>
                                {Number((fetchedOrder?.codCharge || data.codCharge) || 0) > 0 ? (
                                    <div className="flex justify-between text-gray-700"><span>COD charge</span><span className="font-semibold">₹{Number((fetchedOrder?.codCharge || data.codCharge) || 0).toFixed(0)}</span></div>
                                ) : null}
                                <div className="border-t pt-2 flex justify-between text-gray-900"><span className="font-semibold">Total</span><span className="font-extrabold">₹{Number((fetchedOrder?.total || data.total) || 0).toFixed(0)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryPage;
