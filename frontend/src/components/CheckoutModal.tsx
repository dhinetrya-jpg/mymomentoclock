/**
 * 1-Click Instant UPI Checkout Modal
 * Implements the Research Blueprint: Zero login, zero app download friction.
 * Native UPI flow (PhonePe / GPay / Paytm), ₹99 micro-transaction,
 * and 15-second instant delivery simulator.
 */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [selectedPack, setSelectedPack] = useState<'SINGLE' | 'FAMILY'>('SINGLE');
  const [recipientName, setRecipientName] = useState('Ananya');
  const [whatsappNumber, setWhatsappNumber] = useState('+91 98765 43210');
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('IDLE');

  if (!isOpen) return null;

  const price = selectedPack === 'SINGLE' ? 99 : 149;

  const handleSimulatePayment = () => {
    setPaymentStatus('PROCESSING');
    setTimeout(() => {
      setPaymentStatus('COMPLETED');
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
      } catch {
        // safe
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e0205]/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-rose-900/60 bg-[#1e050b] p-6 shadow-2xl text-rose-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rose-950/70 pb-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-amber-300">
              Instant 1-Click Diwali Prosperity Pack
            </h2>
            <p className="mt-0.5 text-xs text-rose-300/60">
              Zero logins · Instant delivery to WhatsApp within 15 seconds
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-rose-300/60 hover:bg-[#2e0914] hover:text-white"
          >
            ✕
          </button>
        </div>

        {paymentStatus !== 'COMPLETED' ? (
          <div className="mt-4 space-y-4">
            {/* Pack Selector */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                onClick={() => setSelectedPack('SINGLE')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  selectedPack === 'SINGLE'
                    ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400'
                    : 'border-rose-950/70 bg-[#25070f] text-rose-300/60 hover:border-rose-800'
                }`}
              >
                <div className="font-semibold text-rose-100">Individual Pack</div>
                <div className="text-[11px] text-rose-300/60 mt-1">1 Personalized Kundli + Card</div>
                <div className="mt-3 font-mono text-base font-bold text-amber-300">₹99</div>
              </button>

              <button
                onClick={() => setSelectedPack('FAMILY')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  selectedPack === 'FAMILY'
                    ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400'
                    : 'border-rose-950/70 bg-[#25070f] text-rose-300/60 hover:border-rose-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-100">Family Gifting (5x)</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">SAVE 70%</span>
                </div>
                <div className="text-[11px] text-rose-300/60 mt-1">Up to 5 Family Members</div>
                <div className="mt-3 font-mono text-base font-bold text-amber-300">₹149</div>
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-rose-300/70 font-medium">Your Name / Primary Recipient:</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-1 w-full rounded border border-rose-900/60 bg-[#280812] px-3 py-2 text-rose-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-rose-300/70 font-medium">WhatsApp Number for Instant PDF Delivery:</label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-rose-900/60 bg-[#280812] px-3 py-2 text-rose-100 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* UPI Deep Link Buttons */}
            <div className="rounded-lg border border-rose-950/70 bg-[#160408] p-3 text-xs space-y-2">
              <div className="text-[11px] text-rose-300/60 font-medium">Select Instant UPI App:</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleSimulatePayment}
                  disabled={paymentStatus === 'PROCESSING'}
                  className="rounded-lg border border-rose-900/60 bg-[#25070f] py-2 font-medium text-rose-100 hover:bg-[#340a15] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="text-emerald-400 font-bold">G</span> Google Pay
                </button>
                <button
                  onClick={handleSimulatePayment}
                  disabled={paymentStatus === 'PROCESSING'}
                  className="rounded-lg border border-rose-900/60 bg-[#25070f] py-2 font-medium text-rose-100 hover:bg-[#340a15] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="text-indigo-400 font-bold">P</span> PhonePe
                </button>
                <button
                  onClick={handleSimulatePayment}
                  disabled={paymentStatus === 'PROCESSING'}
                  className="rounded-lg border border-rose-900/60 bg-[#25070f] py-2 font-medium text-rose-100 hover:bg-[#340a15] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="text-sky-400 font-bold">P</span> Paytm UPI
                </button>
              </div>
            </div>

            <button
              onClick={handleSimulatePayment}
              disabled={paymentStatus === 'PROCESSING'}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-950/40"
            >
              {paymentStatus === 'PROCESSING' ? 'Processing UPI Transaction...' : `Pay ₹${price} via Native UPI`}
            </button>

            {/* Legal Disclaimer */}
            <p className="text-[10px] text-rose-300/40 text-center leading-relaxed">
              Transparent fixed fee. No hidden subscription. Astrological guidance is provided for spiritual reflection and cultural heritage; results are personal and non-guaranteed.
            </p>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <h3 className="font-serif text-xl font-bold text-neutral-100">
              Payment Successful (₹{price})
            </h3>
            <p className="text-xs text-rose-200/80 max-w-sm mx-auto leading-relaxed">
              Your personalized <span className="font-semibold text-amber-300">Diwali Prosperity & Lakshmi Blessing Pack</span> has been generated and dispatched to:
            </p>
            <div className="font-mono text-sm font-bold text-emerald-400 bg-[#140407] border border-rose-950/60 py-2 px-4 rounded-lg inline-block">
              {whatsappNumber} · 15s Delivery Active
            </div>

            <div className="rounded-lg bg-[#25070f] p-4 border border-rose-950/60 text-xs text-left space-y-1.5">
              <div className="font-semibold text-rose-100">Included in your delivery:</div>
              <div className="text-rose-300/70">• High-Resolution Personalized Lakshmi Blessing Wallpaper</div>
              <div className="text-rose-300/70">• Full 10-Page Vedic Kundli, Dasha & Muhurat PDF</div>
              <div className="text-rose-300/70">• 147Hz Audio Focus Resonance Track</div>
              <div className="text-rose-300/70">• 50 Digital Housie Tickets & Game Link</div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onClose}
                className="rounded-lg bg-amber-500 px-6 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400"
              >
                Access My Digital Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
