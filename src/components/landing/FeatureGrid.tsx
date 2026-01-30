import { motion } from "framer-motion";
import { Users, CreditCard, Calendar, BarChart3, Shield, Zap } from "lucide-react";

const features = [
    {
        title: "Member Management",
        desc: "A unified portal for every family. Track genealogies, yahrzeits, and community involvement in one secure place.",
        icon: Users,
        color: "text-blue-700",
        bgColor: "bg-blue-50"
    },
    {
        title: "Seamless Billing",
        desc: "Automate dues, pledges, and event payments. Integrated with Stripe and Cardknox for secure, reliable processing.",
        icon: CreditCard,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50"
    },
    {
        title: "Smart Scheduling",
        desc: "Manage minyanim, room bookings, and community events with an intelligent, integrated calendar system.",
        icon: Calendar,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50"
    },
    {
        title: "Actionable Insights",
        desc: "Real-time analytics on fundraising, attendance, and growth. Data-driven decisions for community leadership.",
        icon: BarChart3,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
    },
    {
        title: "Security First",
        desc: "Enterprise-grade encryption and granular role-based access to keep your community's data safe and private.",
        icon: Shield,
        color: "text-rose-600",
        bgColor: "bg-rose-50"
    },
    {
        title: "Lightning Fast",
        desc: "Built on modern technology for immediate response times, even with thousands of members and transactions.",
        icon: Zap,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50"
    }
];

export default function FeatureGrid() {
    return (
        <section id="features" className="py-24 relative z-20 overflow-hidden">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold font-serif text-stone-900 leading-tight">
                        Everything your community needs, <br />
                        <span className="text-yellow-600 uppercase tracking-widest text-sm font-black pt-2 block">masterfully integrated.</span>
                    </h2>
                    <p className="text-lg text-stone-600 font-medium">
                        ShulGenius replaces scattered spreadsheets and legacy software with a single, elegant platform designed specifically for the unique needs of synagogues.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-3 font-serif">{feature.title}</h3>
                            <p className="text-stone-600 leading-relaxed text-sm font-medium">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
