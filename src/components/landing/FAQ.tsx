import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
    {
        q: "How secure is my community's data?",
        a: "Security is our top priority. We use enterprise-grade SSL encryption for all data transfers and maintain daily backups on secure, distributed servers. Your data is your own, and we never sell or share member information."
    },
    {
        q: "Can we import our existing member records?",
        a: "Yes! We offer free data migration for all new communities. Our support team will help you export your data from spreadsheets or legacy software and ensure it's perfectly mapped to ShulGenius."
    },
    {
        q: "Does ShulGenius handle credit card processing?",
        a: "Absolutely. We are fully integrated with Stripe and Cardknox, providing seamless, PCI-compliant payment processing for dues, donations, and event tickets directly through the platform."
    },
    {
        q: "Is there a limit on the number of members?",
        a: "No. ShulGenius is built to scale with your community. Whether you have 50 families or 5,000, our system handles it all with the same lightning-fast performance."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-24 relative z-20 overflow-hidden">
            <div className="container max-w-4xl mx-auto px-6">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl font-bold font-serif text-stone-900">Frequently Asked Questions</h2>
                    <p className="text-stone-600 font-medium">Everything you need to know about the platform and our process.</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border border-stone-200 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-sm">
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-stone-50 transition-colors"
                            >
                                <span className="font-bold text-stone-900 font-serif text-lg">{faq.q}</span>
                                {openIndex === i ? <Minus className="w-5 h-5 text-yellow-600" /> : <Plus className="w-5 h-5 text-stone-400" />}
                            </button>
                            <AnimatePresence>
                                {openIndex === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 pt-0 text-stone-600 leading-relaxed border-t border-stone-100 bg-stone-50/50 font-medium">
                                            {faq.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
