import { motion } from "framer-motion";

const stats = [
    { label: "Active Members", value: "15,000+" },
    { label: "Communities", value: "850+" },
    { label: "Annual Donations", value: "$45M+" },
    { label: "Time Saved/Week", value: "12 Hours" }
];

export default function StatsStrip() {
    return (
        <section className="py-20 bg-white/40 backdrop-blur-sm text-stone-900 relative z-20 overflow-hidden border-y border-stone-200">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(250,204,21,0.05),transparent_50%)]" />
            <div className="max-w-7xl mx-auto px-6 relative">
                <div className="grid md:grid-cols-4 gap-12">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center space-y-2"
                        >
                            <div className="text-4xl md:text-5xl font-bold font-serif text-yellow-600">
                                {stat.value}
                            </div>
                            <div className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
