import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Clock } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
            <div className="container relative z-20 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-8"
                >
                    <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-600 px-4 py-1.5 rounded-full text-sm font-semibold border border-yellow-100 backdrop-blur-sm">
                        The Operating System for Modern Shuls
                    </div>
                    <h1 className="text-6xl md:text-7xl font-bold font-serif leading-[1.1] text-stone-900">
                        Modern Tools for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-400">
                            Timeless Communities
                        </span>
                    </h1>
                    <p className="text-xl text-stone-600 leading-relaxed max-w-lg font-medium">
                        Complete platform for member management, billing, and community engagement. Built for Gabbais who value time and tradition.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        {/* Using Blue from screenshot for main CTA */}
                        <Link to="/login" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
                            Get Started <ArrowRight className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-200" />
                                ))}
                            </div>
                            <span className="text-sm text-stone-500 font-medium">Joined by 50+ Synagogues</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <FeatureItem text="Automated Billing" />
                        <FeatureItem text="Member Engagement" />
                        <FeatureItem text="Secure Donations" />
                        <FeatureItem text="Global Network" />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="relative hidden lg:block"
                >
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden aspect-[4/3] relative">
                        <div className="p-6 space-y-6 relative">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-400/50" />
                                </div>
                                <div className="h-4 w-32 bg-stone-100 rounded" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-24 bg-yellow-50 rounded-xl border border-yellow-100 p-4 space-y-2">
                                    <div className="w-8 h-2 bg-yellow-200 rounded" />
                                    <div className="w-16 h-4 bg-yellow-500 rounded" />
                                </div>
                                <div className="h-24 bg-stone-50 rounded-xl border border-stone-100 p-4 space-y-2">
                                    <div className="w-8 h-2 bg-stone-200 rounded" />
                                    <div className="w-16 h-4 bg-stone-400 rounded" />
                                </div>
                                <div className="h-24 bg-stone-50 rounded-xl border border-stone-100 p-4 space-y-2">
                                    <div className="w-8 h-2 bg-stone-200 rounded" />
                                    <div className="w-16 h-4 bg-stone-400 rounded" />
                                </div>
                            </div>
                            <div className="h-48 bg-stone-50 rounded-xl border border-stone-100 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-[80%] h-[60%] border-b-2 border-l-2 border-stone-200 relative">
                                        <motion.div
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ duration: 1.5, delay: 1 }}
                                            className="absolute bottom-0 left-[20%] w-[10%] h-[70%] bg-blue-600 rounded-t origin-bottom"
                                        />
                                        <motion.div
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ duration: 1.5, delay: 1.2 }}
                                            className="absolute bottom-0 left-[40%] w-[10%] h-[40%] bg-yellow-400 rounded-t origin-bottom"
                                        />
                                        <motion.div
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ duration: 1.5, delay: 1.4 }}
                                            className="absolute bottom-0 left-[60%] w-[10%] h-[90%] bg-blue-500 rounded-t origin-bottom"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-stone-600">{text}</span>
        </div>
    );
}
